-- Binary Accounting Ledger - tracks ALL money flows in the binary system
CREATE TABLE public.binary_accounting_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  transaction_type TEXT NOT NULL, -- 'purchase', 'commission', 'flush', 'ai_cost', 'admin_profit', 'direct_referral'
  user_id UUID, -- nullable for system-level entries
  related_purchase_id UUID REFERENCES public.binary_ai_purchases(id),
  related_commission_id UUID REFERENCES public.binary_commissions(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.binary_accounting_ledger ENABLE ROW LEVEL SECURITY;

-- Only admins can view accounting ledger
CREATE POLICY "Admins can view accounting ledger"
  ON public.binary_accounting_ledger
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Binary Flush Log - specifically tracks flushed/lost volume
CREATE TABLE public.binary_flush_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  flush_reason TEXT NOT NULL, -- 'daily_cap_exceeded', 'volume_consumed'
  volume_flushed NUMERIC NOT NULL DEFAULT 0,
  potential_commission NUMERIC NOT NULL DEFAULT 0, -- what they would have earned
  actual_commission NUMERIC NOT NULL DEFAULT 0, -- what they actually earned
  commission_lost NUMERIC NOT NULL DEFAULT 0, -- difference (goes to admin)
  cycles_affected INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.binary_flush_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own flush history
CREATE POLICY "Users can view own flush log"
  ON public.binary_flush_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all flush logs
CREATE POLICY "Admins can view all flush logs"
  ON public.binary_flush_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Binary System Summary - aggregated daily stats for quick reporting
CREATE TABLE public.binary_daily_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  summary_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  total_purchases NUMERIC NOT NULL DEFAULT 0,
  total_volume_generated NUMERIC NOT NULL DEFAULT 0,
  total_commissions_paid NUMERIC NOT NULL DEFAULT 0,
  total_ai_cost_deducted NUMERIC NOT NULL DEFAULT 0,
  total_admin_profit NUMERIC NOT NULL DEFAULT 0,
  total_direct_referral_paid NUMERIC NOT NULL DEFAULT 0,
  total_volume_flushed NUMERIC NOT NULL DEFAULT 0,
  total_commission_lost_to_caps NUMERIC NOT NULL DEFAULT 0,
  net_admin_earnings NUMERIC NOT NULL DEFAULT 0, -- admin_profit + flushed commissions
  total_cycles_completed INTEGER NOT NULL DEFAULT 0,
  total_users_cycled INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.binary_daily_summary ENABLE ROW LEVEL SECURITY;

-- Only admins can view daily summary
CREATE POLICY "Admins can view daily summary"
  ON public.binary_daily_summary
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update the binary_apply_purchase_volume function to record accounting entries
CREATE OR REPLACE FUNCTION public.binary_apply_purchase_volume(
  p_purchase_id UUID,
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_network_record RECORD;
  v_current_user_id UUID;
  v_placement_leg TEXT;
  v_volume_to_add NUMERIC;
  v_cycle_volume NUMERIC := 11960; -- Fixed: ₱11,960 per leg to cycle
  v_cycles_completed INTEGER;
  v_weaker_leg NUMERIC;
  v_used_volume NUMERIC;
  v_matched_volume NUMERIC;
  v_total_deductions NUMERIC;
  v_distributable_amount NUMERIC;
  v_total_commission NUMERIC;
  v_final_commission NUMERIC;
  v_commission_lost NUMERIC;
  v_ai_cost_percent NUMERIC := 30;
  v_admin_profit_percent NUMERIC := 10;
  v_direct_referral_percent NUMERIC := 5;
  v_cycle_commission_percent NUMERIC := 10;
  v_daily_cap NUMERIC := 50000;
  v_today_earnings NUMERIC;
  v_remaining_cap NUMERIC;
  v_result JSONB := '{"success": true, "cycles": [], "total_commission": 0}'::jsonb;
  v_ai_cost_amount NUMERIC;
  v_admin_profit_amount NUMERIC;
  v_direct_referral_amount NUMERIC;
  v_sponsor_id UUID;
  v_new_commission_id UUID;
BEGIN
  -- Get purchase volume
  v_volume_to_add := p_amount;

  -- Get the purchaser's network record to find their placement
  SELECT * INTO v_network_record
  FROM binary_network
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "User not in binary network"}'::jsonb;
  END IF;

  -- Record the purchase in accounting ledger
  INSERT INTO binary_accounting_ledger (transaction_type, user_id, related_purchase_id, amount, description)
  VALUES ('purchase', p_user_id, p_purchase_id, v_volume_to_add, 'Binary package purchase');

  -- Get sponsor for direct referral
  v_sponsor_id := v_network_record.sponsor_id;

  -- Traverse up the tree and add volume to appropriate legs
  v_current_user_id := v_network_record.parent_id;
  v_placement_leg := v_network_record.placement_leg::TEXT;

  WHILE v_current_user_id IS NOT NULL LOOP
    -- Add volume to the appropriate leg of the parent
    IF v_placement_leg = 'left' THEN
      UPDATE binary_network
      SET left_volume = COALESCE(left_volume, 0) + v_volume_to_add,
          updated_at = now()
      WHERE user_id = v_current_user_id;
    ELSE
      UPDATE binary_network
      SET right_volume = COALESCE(right_volume, 0) + v_volume_to_add,
          updated_at = now()
      WHERE user_id = v_current_user_id;
    END IF;

    -- Check if this user can cycle
    SELECT * INTO v_network_record
    FROM binary_network
    WHERE user_id = v_current_user_id;

    -- Calculate weaker leg
    v_weaker_leg := LEAST(
      COALESCE(v_network_record.left_volume, 0),
      COALESCE(v_network_record.right_volume, 0)
    );

    -- Calculate cycles completed (11,960 per leg required)
    v_cycles_completed := FLOOR(v_weaker_leg / v_cycle_volume);

    IF v_cycles_completed > 0 THEN
      v_used_volume := v_cycles_completed * v_cycle_volume;

      -- Matched volume per cycle = 11,960 × 2 (both legs)
      v_matched_volume := v_cycles_completed * v_cycle_volume * 2;

      -- Calculate individual deduction amounts
      v_ai_cost_amount := v_matched_volume * (v_ai_cost_percent / 100);
      v_admin_profit_amount := v_matched_volume * (v_admin_profit_percent / 100);
      v_direct_referral_amount := v_matched_volume * (v_direct_referral_percent / 100);

      -- Calculate deductions from matched volume
      v_total_deductions := v_ai_cost_amount + v_admin_profit_amount + v_direct_referral_amount;
      v_distributable_amount := v_matched_volume - v_total_deductions;

      -- Commission is percentage of distributable amount
      v_total_commission := v_distributable_amount * v_cycle_commission_percent / 100;

      -- Check daily cap
      SELECT COALESCE(total_earned, 0) INTO v_today_earnings
      FROM binary_daily_earnings
      WHERE user_id = v_current_user_id
        AND earning_date = CURRENT_DATE;

      v_remaining_cap := v_daily_cap - COALESCE(v_today_earnings, 0);
      v_final_commission := LEAST(v_total_commission, GREATEST(v_remaining_cap, 0));
      v_commission_lost := v_total_commission - v_final_commission;

      IF v_final_commission > 0 OR v_commission_lost > 0 THEN
        -- Deduct used volume from both legs
        UPDATE binary_network
        SET left_volume = left_volume - v_used_volume,
            right_volume = right_volume - v_used_volume,
            total_cycles = COALESCE(total_cycles, 0) + v_cycles_completed,
            updated_at = now()
        WHERE user_id = v_current_user_id;

        -- Record commission if any
        IF v_final_commission > 0 THEN
          INSERT INTO binary_commissions (user_id, amount, cycles_matched, left_volume_used, right_volume_used)
          VALUES (v_current_user_id, v_final_commission, v_cycles_completed, v_used_volume, v_used_volume)
          RETURNING id INTO v_new_commission_id;

          -- Record commission in accounting ledger
          INSERT INTO binary_accounting_ledger (transaction_type, user_id, related_commission_id, amount, description)
          VALUES ('commission', v_current_user_id, v_new_commission_id, v_final_commission, 
                  'Binary cycle commission: ' || v_cycles_completed || ' cycles');

          -- Update daily earnings
          INSERT INTO binary_daily_earnings (user_id, earning_date, total_earned, cycles_completed)
          VALUES (v_current_user_id, CURRENT_DATE, v_final_commission, v_cycles_completed)
          ON CONFLICT (user_id, earning_date)
          DO UPDATE SET 
            total_earned = binary_daily_earnings.total_earned + v_final_commission,
            cycles_completed = binary_daily_earnings.cycles_completed + v_cycles_completed,
            updated_at = now();

          -- Update user credits
          UPDATE profiles
          SET credits = COALESCE(credits, 0) + v_final_commission
          WHERE id = v_current_user_id;
        END IF;

        -- Record AI cost deduction
        INSERT INTO binary_accounting_ledger (transaction_type, user_id, related_purchase_id, amount, description)
        VALUES ('ai_cost', NULL, p_purchase_id, v_ai_cost_amount, 
                'AI cost deduction (' || v_ai_cost_percent || '%) from ' || v_cycles_completed || ' cycles');

        -- Record admin profit
        INSERT INTO binary_accounting_ledger (transaction_type, user_id, related_purchase_id, amount, description)
        VALUES ('admin_profit', NULL, p_purchase_id, v_admin_profit_amount, 
                'Admin profit (' || v_admin_profit_percent || '%) from ' || v_cycles_completed || ' cycles');

        -- Record and pay direct referral commission
        IF v_sponsor_id IS NOT NULL THEN
          INSERT INTO binary_accounting_ledger (transaction_type, user_id, related_purchase_id, amount, description)
          VALUES ('direct_referral', v_sponsor_id, p_purchase_id, v_direct_referral_amount, 
                  'Direct referral commission (5%) from ' || v_cycles_completed || ' cycles');

          UPDATE profiles
          SET credits = COALESCE(credits, 0) + v_direct_referral_amount
          WHERE id = v_sponsor_id;
        END IF;

        -- Record flush if commission was lost to cap
        IF v_commission_lost > 0 THEN
          INSERT INTO binary_flush_log (user_id, flush_reason, volume_flushed, potential_commission, actual_commission, commission_lost, cycles_affected)
          VALUES (v_current_user_id, 'daily_cap_exceeded', v_used_volume * 2, v_total_commission, v_final_commission, v_commission_lost, v_cycles_completed);

          -- Record flush in accounting ledger (goes to admin)
          INSERT INTO binary_accounting_ledger (transaction_type, user_id, related_purchase_id, amount, description)
          VALUES ('flush', v_current_user_id, p_purchase_id, v_commission_lost, 
                  'Commission lost to daily cap - retained by system');
        END IF;

        -- Update daily summary
        INSERT INTO binary_daily_summary (summary_date, total_commissions_paid, total_ai_cost_deducted, total_admin_profit, total_direct_referral_paid, total_commission_lost_to_caps, total_cycles_completed, total_users_cycled)
        VALUES (CURRENT_DATE, v_final_commission, v_ai_cost_amount, v_admin_profit_amount, v_direct_referral_amount, v_commission_lost, v_cycles_completed, 1)
        ON CONFLICT (summary_date)
        DO UPDATE SET 
          total_commissions_paid = binary_daily_summary.total_commissions_paid + v_final_commission,
          total_ai_cost_deducted = binary_daily_summary.total_ai_cost_deducted + v_ai_cost_amount,
          total_admin_profit = binary_daily_summary.total_admin_profit + v_admin_profit_amount,
          total_direct_referral_paid = binary_daily_summary.total_direct_referral_paid + v_direct_referral_amount,
          total_commission_lost_to_caps = binary_daily_summary.total_commission_lost_to_caps + v_commission_lost,
          total_cycles_completed = binary_daily_summary.total_cycles_completed + v_cycles_completed,
          total_users_cycled = binary_daily_summary.total_users_cycled + 1,
          net_admin_earnings = binary_daily_summary.total_admin_profit + binary_daily_summary.total_commission_lost_to_caps,
          updated_at = now();

        v_result := jsonb_set(v_result, '{total_commission}', to_jsonb(COALESCE((v_result->>'total_commission')::NUMERIC, 0) + v_final_commission));
      END IF;
    END IF;

    -- Move up the tree
    v_placement_leg := v_network_record.placement_leg::TEXT;
    v_current_user_id := v_network_record.parent_id;
  END LOOP;

  -- Update purchase volume in daily summary
  UPDATE binary_daily_summary
  SET total_purchases = total_purchases + 1,
      total_volume_generated = total_volume_generated + v_volume_to_add,
      updated_at = now()
  WHERE summary_date = CURRENT_DATE;

  IF NOT FOUND THEN
    INSERT INTO binary_daily_summary (summary_date, total_purchases, total_volume_generated)
    VALUES (CURRENT_DATE, 1, v_volume_to_add);
  END IF;

  RETURN v_result;
END;
$$;

-- Add unique constraint to binary_daily_earnings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'binary_daily_earnings_user_date_unique'
  ) THEN
    ALTER TABLE binary_daily_earnings 
    ADD CONSTRAINT binary_daily_earnings_user_date_unique 
    UNIQUE (user_id, earning_date);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;