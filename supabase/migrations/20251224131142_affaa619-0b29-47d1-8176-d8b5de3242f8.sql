-- Update the binary_apply_purchase_volume function to:
-- 1. Use tier-specific cycle volume (price × 4 per leg)
-- 2. Calculate cycle commission as 10% of matched volume
-- 3. Deduct AI cost, admin profit, and 5% direct referral before distributing
-- 4. Ensure no overpaying

CREATE OR REPLACE FUNCTION public.binary_apply_purchase_volume(_buyer_user_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_node_id uuid;
  v_child_node_id uuid;
  v_parent_node_id uuid;
  v_parent_user_id uuid;
  v_parent_parent_id uuid;
  v_left_child_id uuid;
  v_left_volume numeric;
  v_right_volume numeric;

  v_leg text;
  v_cycle_volume numeric;
  v_cycle_commission_percent numeric;
  v_daily_cap numeric;
  v_tier_daily_cap numeric;
  v_user_tier_amount numeric;
  v_tier_index integer;
  v_tier_price numeric;
  v_tier_cost numeric;
  v_admin_safety_net numeric;
  v_direct_referral_percent numeric := 5; -- 5% direct referral deduction

  v_earning_date date;
  v_daily_id uuid;
  v_daily_total numeric;

  v_possible_cycles integer;
  v_allowed_cycles integer;
  v_cycles_matched integer;
  v_used_volume numeric;
  v_matched_total_volume numeric;
  v_ai_cost_per_unit numeric;
  v_admin_profit numeric;
  v_direct_referral_amount numeric;
  v_distributable_amount numeric;
  v_commission_amount numeric;
  v_max_commission_per_upline numeric;
  v_remaining_pool numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;

  PERFORM set_config('row_security', 'off', true);

  SELECT bn.id, bn.parent_id INTO v_buyer_node_id, v_parent_node_id
  FROM public.binary_network bn WHERE bn.user_id = _buyer_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_child_node_id := v_buyer_node_id;

  -- Get admin safety net percentage
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_admin_safety_net'), 35) INTO v_admin_safety_net;
  
  -- Get cycle commission percentage (default 10%)
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_cycle_commission_percent'), 10) INTO v_cycle_commission_percent;
  
  -- Default global daily cap as fallback
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_daily_cap'), 0) INTO v_daily_cap;

  -- Determine buyer's tier and calculate tier-specific cycle volume (price × 4)
  v_tier_price := _amount;
  v_cycle_volume := _amount * 4; -- Volume required per leg = tier price × 4
  
  -- Get AI cost for the tier
  IF _amount >= 10000 THEN
    v_tier_index := 3;
  ELSIF _amount >= 5000 THEN
    v_tier_index := 2;
  ELSE
    v_tier_index := 1;
  END IF;
  
  SELECT COALESCE(value::numeric, 0) INTO v_tier_cost
  FROM public.app_settings 
  WHERE key = 'ai_credit_tier_' || v_tier_index || '_cost';

  v_earning_date := (now() AT TIME ZONE 'UTC')::date;

  WHILE v_parent_node_id IS NOT NULL LOOP
    SELECT bn.user_id, bn.parent_id, bn.left_child_id, COALESCE(bn.left_volume, 0), COALESCE(bn.right_volume, 0)
      INTO v_parent_user_id, v_parent_parent_id, v_left_child_id, v_left_volume, v_right_volume
    FROM public.binary_network bn WHERE bn.id = v_parent_node_id;
    EXIT WHEN NOT FOUND;

    v_leg := CASE WHEN v_left_child_id = v_child_node_id THEN 'left' ELSE 'right' END;

    IF v_leg = 'left' THEN v_left_volume := v_left_volume + _amount;
    ELSE v_right_volume := v_right_volume + _amount;
    END IF;

    UPDATE public.binary_network SET left_volume = v_left_volume, right_volume = v_right_volume, updated_at = now()
    WHERE id = v_parent_node_id;

    -- Get the upline's tier-specific daily cap
    v_tier_daily_cap := v_daily_cap;
    
    SELECT bap.amount INTO v_user_tier_amount
    FROM public.binary_ai_purchases bap
    WHERE bap.user_id = v_parent_user_id AND bap.status = 'approved'
    ORDER BY bap.approved_at DESC NULLS LAST
    LIMIT 1;
    
    IF v_user_tier_amount IS NOT NULL THEN
      IF v_user_tier_amount >= 10000 THEN
        v_tier_index := 3;
      ELSIF v_user_tier_amount >= 5000 THEN
        v_tier_index := 2;
      ELSE
        v_tier_index := 1;
      END IF;
      
      SELECT COALESCE(value::numeric, v_daily_cap) INTO v_tier_daily_cap
      FROM public.app_settings 
      WHERE key = 'ai_credit_tier_' || v_tier_index || '_daily_cap';
      
      IF v_tier_daily_cap IS NULL OR v_tier_daily_cap <= 0 THEN
        v_tier_daily_cap := v_daily_cap;
      END IF;
    END IF;

    IF v_cycle_volume > 0 THEN
      v_possible_cycles := floor(LEAST(v_left_volume, v_right_volume) / v_cycle_volume);
      
      IF v_possible_cycles > 0 THEN
        -- Calculate matched total volume (both legs combined for the cycle)
        v_matched_total_volume := v_possible_cycles * v_cycle_volume * 2;
        
        -- Calculate deductions from matched volume:
        -- 1. AI Cost (proportional to volume matched)
        v_ai_cost_per_unit := v_tier_cost / v_tier_price; -- cost per peso of volume
        v_admin_profit := (v_matched_total_volume * v_admin_safety_net) / 100;
        v_direct_referral_amount := (v_matched_total_volume * v_direct_referral_percent) / 100;
        
        -- Distributable amount = matched volume - AI cost - admin profit - direct referral
        v_distributable_amount := v_matched_total_volume - (v_ai_cost_per_unit * v_matched_total_volume) - v_admin_profit - v_direct_referral_amount;
        
        -- Ensure distributable amount is positive
        IF v_distributable_amount < 0 THEN
          v_distributable_amount := 0;
        END IF;
        
        -- Commission per cycle = 10% of matched volume per cycle (after deductions)
        v_commission_amount := (v_distributable_amount * v_cycle_commission_percent) / 100;
        
        -- Apply daily cap limit
        v_allowed_cycles := v_possible_cycles;
        IF v_tier_daily_cap > 0 THEN
          SELECT bde.id, COALESCE(bde.total_earned, 0) INTO v_daily_id, v_daily_total
          FROM public.binary_daily_earnings bde
          WHERE bde.user_id = v_parent_user_id AND bde.earning_date = v_earning_date;
          
          -- Calculate max commission allowed based on daily cap
          v_max_commission_per_upline := GREATEST(0, v_tier_daily_cap - COALESCE(v_daily_total, 0));
          
          IF v_commission_amount > v_max_commission_per_upline THEN
            v_commission_amount := v_max_commission_per_upline;
            -- Recalculate cycles based on capped commission
            IF v_commission_amount > 0 THEN
              v_allowed_cycles := 1; -- At least 1 cycle if any commission allowed
            ELSE
              v_allowed_cycles := 0;
            END IF;
          END IF;
        END IF;

        v_cycles_matched := LEAST(v_possible_cycles, v_allowed_cycles);

        IF v_cycles_matched > 0 AND v_commission_amount > 0 THEN
          v_used_volume := v_cycles_matched * v_cycle_volume;

          UPDATE public.binary_network
          SET left_volume = GREATEST(0, left_volume - v_used_volume),
              right_volume = GREATEST(0, right_volume - v_used_volume),
              total_cycles = COALESCE(total_cycles, 0) + v_cycles_matched,
              updated_at = now()
          WHERE id = v_parent_node_id;

          INSERT INTO public.binary_commissions (user_id, cycles_matched, left_volume_used, right_volume_used, amount, created_at)
          VALUES (v_parent_user_id, v_cycles_matched, v_used_volume, v_used_volume, v_commission_amount, now());

          IF v_daily_id IS NOT NULL THEN
            UPDATE public.binary_daily_earnings
            SET total_earned = COALESCE(total_earned, 0) + v_commission_amount,
                cycles_completed = COALESCE(cycles_completed, 0) + v_cycles_matched,
                updated_at = now()
            WHERE id = v_daily_id;
          ELSE
            INSERT INTO public.binary_daily_earnings (user_id, earning_date, total_earned, cycles_completed, created_at)
            VALUES (v_parent_user_id, v_earning_date, v_commission_amount, v_cycles_matched, now());
          END IF;

          UPDATE public.profiles
          SET binary_balance = COALESCE(binary_balance, 0) + v_commission_amount
          WHERE id = v_parent_user_id;
        END IF;
      END IF;
    END IF;

    v_child_node_id := v_parent_node_id;
    v_parent_node_id := v_parent_parent_id;
  END LOOP;

  PERFORM set_config('row_security', 'on', true);
END;
$$;