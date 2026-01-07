-- Function to distribute BeesMate premium commissions
CREATE OR REPLACE FUNCTION public.distribute_beesmate_premium_commission(
  p_subscription_id UUID,
  p_user_id UUID,
  p_amount DECIMAL,
  p_tier_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_level INTEGER := 1;
  v_current_user_id UUID := p_user_id;
  v_unilevel_percent DECIMAL;
  v_commission_amount DECIMAL;
  v_total_distributed DECIMAL := 0;
BEGIN
  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_user_id;
  IF v_referrer_id IS NULL THEN RETURN; END IF;

  WHILE v_referrer_id IS NOT NULL AND v_level <= 7 LOOP
    SELECT setting_value::DECIMAL INTO v_unilevel_percent
    FROM app_settings WHERE key = 'unilevel_level_' || v_level || '_percent';

    IF v_unilevel_percent IS NULL THEN
      v_unilevel_percent := CASE v_level
        WHEN 1 THEN 4.0 WHEN 2 THEN 3.0 WHEN 3 THEN 2.5 WHEN 4 THEN 2.0
        WHEN 5 THEN 1.5 WHEN 6 THEN 1.0 WHEN 7 THEN 0.5 ELSE 0 END;
    END IF;

    v_commission_amount := p_amount * (v_unilevel_percent / 100);

    IF v_commission_amount > 0 THEN
      INSERT INTO commission_history (user_id, commission_type, amount, source_user_id, level, status, related_order_id, description)
      VALUES (v_referrer_id, 'unilevel', v_commission_amount, p_user_id, v_level, 'pending', p_subscription_id, 'BeesMate Premium subscription - Level ' || v_level);
      v_total_distributed := v_total_distributed + v_commission_amount;
    END IF;

    SELECT referred_by INTO v_current_user_id FROM profiles WHERE id = v_referrer_id;
    v_referrer_id := v_current_user_id;
    v_level := v_level + 1;
  END LOOP;

  UPDATE beesmate_referral_stats
  SET total_earnings = total_earnings + v_total_distributed, this_month_earnings = this_month_earnings + v_total_distributed, last_updated = now()
  WHERE user_id = (SELECT referred_by FROM profiles WHERE id = p_user_id);
END;
$$;

-- Function to generate ASPN Sales Points
CREATE OR REPLACE FUNCTION public.generate_aspn_sales_points(
  p_user_id UUID,
  p_amount DECIMAL,
  p_source_type TEXT,
  p_source_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment RECORD;
  v_sp_amount DECIMAL;
  v_decay_rate DECIMAL := 0.1;
  v_max_levels INTEGER := 10;
  v_current_user_id UUID := p_user_id;
  v_ancestor_id UUID;
  v_level INTEGER := 0;
  v_decayed_sp DECIMAL;
BEGIN
  SELECT ue.*, t.sp_rate, t.lifetime_cap INTO v_enrollment
  FROM aspn_user_enrollment ue JOIN aspn_tiers t ON t.id = ue.tier_id WHERE ue.user_id = p_user_id;

  IF v_enrollment IS NULL THEN
    INSERT INTO aspn_user_enrollment (user_id, tier_id)
    SELECT p_user_id, id FROM aspn_tiers WHERE tier_key = 'bronze' LIMIT 1
    RETURNING * INTO v_enrollment;
    SELECT sp_rate, lifetime_cap INTO v_enrollment.sp_rate, v_enrollment.lifetime_cap FROM aspn_tiers WHERE tier_key = 'bronze';
  END IF;

  v_sp_amount := p_amount * COALESCE(v_enrollment.sp_rate, 1.0);

  INSERT INTO aspn_sp_ledger (user_id, source_user_id, source_type, source_id, sp_amount, level_from_source, decay_applied)
  VALUES (p_user_id, p_user_id, p_source_type, p_source_id, v_sp_amount, 0, 1.0);

  UPDATE aspn_user_enrollment SET total_sp_earned = total_sp_earned + v_sp_amount, updated_at = now() WHERE user_id = p_user_id;

  SELECT referred_by INTO v_ancestor_id FROM profiles WHERE id = p_user_id;
  v_level := 1;

  WHILE v_ancestor_id IS NOT NULL AND v_level <= v_max_levels LOOP
    v_decayed_sp := v_sp_amount * POWER(1 - v_decay_rate, v_level);
    IF v_decayed_sp > 0.01 THEN
      INSERT INTO aspn_sp_ledger (user_id, source_user_id, source_type, source_id, sp_amount, level_from_source, decay_applied)
      VALUES (v_ancestor_id, p_user_id, p_source_type, p_source_id, v_decayed_sp, v_level, POWER(1 - v_decay_rate, v_level));
      UPDATE aspn_user_enrollment SET total_sp_earned = total_sp_earned + v_decayed_sp, updated_at = now() WHERE user_id = v_ancestor_id;
    END IF;
    SELECT referred_by INTO v_current_user_id FROM profiles WHERE id = v_ancestor_id;
    v_ancestor_id := v_current_user_id;
    v_level := v_level + 1;
  END LOOP;
END;
$$;