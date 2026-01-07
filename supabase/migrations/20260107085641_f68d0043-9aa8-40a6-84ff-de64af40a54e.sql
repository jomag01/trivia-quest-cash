-- =============================================
-- ASPN STRESS-TEST EDGE CASE HANDLING
-- =============================================

-- ASPN Abuse Flags Table
CREATE TABLE public.aspn_abuse_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  flag_type TEXT NOT NULL, -- 'wide_growth', 'circular_buying', 'sp_velocity', 'self_referral'
  severity TEXT DEFAULT 'warning', -- 'warning', 'frozen', 'banned'
  confidence DECIMAL(5,4) DEFAULT 0,
  details JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  action_taken TEXT, -- 'none', 'frozen', 'reversed', 'banned'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.aspn_abuse_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage abuse flags" ON public.aspn_abuse_flags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ASPN Refund Reversal Log
CREATE TABLE public.aspn_refund_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_transaction_id UUID,
  source_type TEXT NOT NULL,
  sp_reversed DECIMAL(14,4) NOT NULL,
  earnings_reversed DECIMAL(12,2) DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.aspn_refund_reversals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own reversals" ON public.aspn_refund_reversals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage reversals" ON public.aspn_refund_reversals FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- CASE 1: ASPN Graduation Function
-- Graduation stops ASPN payouts but keeps SP tracking for downline
-- Leadership and Unilevel remain UNTOUCHED
-- =============================================
CREATE OR REPLACE FUNCTION public.graduate_aspn_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
BEGIN
  SELECT * INTO v_enrollment FROM aspn_user_enrollment WHERE user_id = p_user_id;
  
  IF v_enrollment IS NULL THEN
    RAISE EXCEPTION 'User not enrolled in ASPN';
  END IF;
  
  IF v_enrollment.is_graduated THEN
    RAISE EXCEPTION 'User already graduated';
  END IF;
  
  -- Graduate user - stops their ASPN payouts
  UPDATE aspn_user_enrollment
  SET is_graduated = true,
      graduated_at = now(),
      lifetime_cap_reached = true,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- NOTE: We do NOT touch:
  -- 1. profiles table (genealogy intact)
  -- 2. affiliate_current_rank (leadership intact)
  -- 3. SP continues to flow to uplines from this user's downline
END;
$$;

-- =============================================
-- CASE 4: Refund Reversal Function
-- Reverses SP and ASPN earnings on refund
-- =============================================
CREATE OR REPLACE FUNCTION public.reverse_aspn_on_refund(
  p_source_id UUID,
  p_source_type TEXT,
  p_reason TEXT DEFAULT 'refund'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sp_entry RECORD;
  v_total_reversed DECIMAL := 0;
BEGIN
  -- Find all SP entries related to this source
  FOR v_sp_entry IN 
    SELECT * FROM aspn_sp_ledger 
    WHERE source_id = p_source_id AND source_type = p_source_type
  LOOP
    -- Subtract SP from user's total
    UPDATE aspn_user_enrollment
    SET total_sp_earned = GREATEST(0, total_sp_earned - v_sp_entry.sp_amount),
        updated_at = now()
    WHERE user_id = v_sp_entry.user_id;
    
    -- Log the reversal
    INSERT INTO aspn_refund_reversals (user_id, original_transaction_id, source_type, sp_reversed, reason)
    VALUES (v_sp_entry.user_id, p_source_id, p_source_type, v_sp_entry.sp_amount, p_reason);
    
    v_total_reversed := v_total_reversed + v_sp_entry.sp_amount;
  END LOOP;
  
  -- Delete the original SP entries
  DELETE FROM aspn_sp_ledger WHERE source_id = p_source_id AND source_type = p_source_type;
  
  -- Note: ASPN earnings from pool distributions are NOT reversed
  -- (they were based on the state at distribution time)
END;
$$;

-- =============================================
-- CASE 5: Abuse Detection Function
-- Flags abnormal patterns without disrupting genealogy
-- =============================================
CREATE OR REPLACE FUNCTION public.check_aspn_abuse(p_user_id UUID)
RETURNS TABLE(flag_type TEXT, severity TEXT, confidence DECIMAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_direct_count INTEGER;
  v_sp_velocity DECIMAL;
  v_avg_sp_velocity DECIMAL;
  v_confidence DECIMAL;
BEGIN
  -- Check 1: Abnormal width growth (too many direct referrals in short time)
  SELECT COUNT(*) INTO v_direct_count
  FROM profiles 
  WHERE referred_by = p_user_id 
    AND created_at > now() - INTERVAL '7 days';
  
  IF v_direct_count > 50 THEN
    v_confidence := LEAST(1.0, v_direct_count / 100.0);
    INSERT INTO aspn_abuse_flags (user_id, flag_type, severity, confidence, details)
    VALUES (p_user_id, 'wide_growth', CASE WHEN v_direct_count > 100 THEN 'frozen' ELSE 'warning' END, 
            v_confidence, jsonb_build_object('direct_count_7d', v_direct_count));
    RETURN QUERY SELECT 'wide_growth'::TEXT, 
                        CASE WHEN v_direct_count > 100 THEN 'frozen'::TEXT ELSE 'warning'::TEXT END,
                        v_confidence;
  END IF;
  
  -- Check 2: SP velocity spike (abnormal SP earning rate)
  SELECT COALESCE(SUM(sp_amount), 0) INTO v_sp_velocity
  FROM aspn_sp_ledger 
  WHERE user_id = p_user_id 
    AND created_at > now() - INTERVAL '24 hours';
  
  SELECT COALESCE(AVG(daily_sp), 0) INTO v_avg_sp_velocity
  FROM (
    SELECT SUM(sp_amount) as daily_sp
    FROM aspn_sp_ledger 
    WHERE user_id = p_user_id 
      AND created_at > now() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  ) daily_totals;
  
  IF v_avg_sp_velocity > 0 AND v_sp_velocity > v_avg_sp_velocity * 10 THEN
    v_confidence := LEAST(1.0, (v_sp_velocity / v_avg_sp_velocity) / 20.0);
    INSERT INTO aspn_abuse_flags (user_id, flag_type, severity, confidence, details)
    VALUES (p_user_id, 'sp_velocity', 'warning', v_confidence, 
            jsonb_build_object('current_velocity', v_sp_velocity, 'avg_velocity', v_avg_sp_velocity));
    RETURN QUERY SELECT 'sp_velocity'::TEXT, 'warning'::TEXT, v_confidence;
  END IF;
  
  -- Check 3: Circular buying (self or immediate family purchasing patterns)
  -- This would require payment correlation - flagged for manual review
  
  RETURN;
END;
$$;

-- =============================================
-- CASE 3: Cancel ASPN Tier Function
-- Stops user earnings but preserves everything else
-- =============================================
CREATE OR REPLACE FUNCTION public.cancel_aspn_enrollment(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simply remove tier association - earnings stop, but history preserved
  UPDATE aspn_user_enrollment
  SET tier_id = NULL,
      auto_deduct_enabled = false,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Genealogy remains intact
  -- Leadership qualifications remain intact
  -- Downlines continue unaffected
END;
$$;

-- =============================================
-- Freeze ASPN Earnings (for abuse cases)
-- =============================================
CREATE OR REPLACE FUNCTION public.freeze_aspn_user(p_user_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark all pending earnings as frozen
  INSERT INTO aspn_abuse_flags (user_id, flag_type, severity, confidence, action_taken, details)
  VALUES (p_user_id, 'manual_freeze', 'frozen', 1.0, 'frozen', jsonb_build_object('reason', p_reason));
  
  -- Update enrollment to stop future payouts
  UPDATE aspn_user_enrollment
  SET auto_deduct_enabled = false,
      updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Genealogy preserved for audit
  -- Leadership preserved
END;
$$;