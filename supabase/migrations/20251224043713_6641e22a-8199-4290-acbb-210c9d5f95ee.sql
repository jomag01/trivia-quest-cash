-- Update the binary_apply_purchase_volume function to use tier-specific daily caps
CREATE OR REPLACE FUNCTION public.binary_apply_purchase_volume(_buyer_user_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
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
  v_cycle_commission numeric;
  v_daily_cap numeric;
  v_tier_daily_cap numeric;
  v_user_tier_amount numeric;
  v_tier_index integer;

  v_earning_date date;
  v_daily_id uuid;
  v_daily_total numeric;

  v_possible_cycles integer;
  v_allowed_cycles integer;
  v_cycles_matched integer;
  v_used_volume numeric;
  v_commission_amount numeric;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;

  PERFORM set_config('row_security', 'off', true);

  SELECT bn.id, bn.parent_id INTO v_buyer_node_id, v_parent_node_id
  FROM public.binary_network bn WHERE bn.user_id = _buyer_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_child_node_id := v_buyer_node_id;

  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_cycle_volume'), 1000) INTO v_cycle_volume;
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_cycle_commission'), 100) INTO v_cycle_commission;
  -- Default global daily cap as fallback
  SELECT COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'binary_daily_cap'), 0) INTO v_daily_cap;

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

    IF v_cycle_volume > 0 AND v_cycle_commission > 0 THEN
      v_possible_cycles := floor(LEAST(v_left_volume, v_right_volume) / v_cycle_volume);
      v_allowed_cycles := v_possible_cycles;

      -- Determine the user's tier-specific daily cap based on their approved purchase
      v_tier_daily_cap := v_daily_cap; -- Default to global cap
      
      -- Get the user's latest approved purchase amount to determine their tier
      SELECT bap.amount INTO v_user_tier_amount
      FROM public.binary_ai_purchases bap
      WHERE bap.user_id = v_parent_user_id AND bap.status = 'approved'
      ORDER BY bap.approved_at DESC NULLS LAST
      LIMIT 1;
      
      IF v_user_tier_amount IS NOT NULL THEN
        -- Match tier by price and get tier-specific daily cap
        -- Tier 1: ~2990, Tier 2: ~5990, Tier 3: ~11990
        IF v_user_tier_amount >= 10000 THEN
          v_tier_index := 3;
        ELSIF v_user_tier_amount >= 5000 THEN
          v_tier_index := 2;
        ELSE
          v_tier_index := 1;
        END IF;
        
        -- Fetch the tier-specific daily cap
        SELECT COALESCE(value::numeric, v_daily_cap) INTO v_tier_daily_cap
        FROM public.app_settings 
        WHERE key = 'ai_credit_tier_' || v_tier_index || '_daily_cap';
        
        -- If no tier-specific cap found, use global default
        IF v_tier_daily_cap IS NULL OR v_tier_daily_cap <= 0 THEN
          v_tier_daily_cap := v_daily_cap;
        END IF;
      END IF;

      IF v_tier_daily_cap > 0 THEN
        SELECT bde.id, COALESCE(bde.total_earned, 0) INTO v_daily_id, v_daily_total
        FROM public.binary_daily_earnings bde
        WHERE bde.user_id = v_parent_user_id AND bde.earning_date = v_earning_date;
        v_allowed_cycles := floor(GREATEST(0, (v_tier_daily_cap - COALESCE(v_daily_total, 0))) / v_cycle_commission);
      END IF;

      v_cycles_matched := LEAST(v_possible_cycles, v_allowed_cycles);

      IF v_cycles_matched > 0 THEN
        v_used_volume := v_cycles_matched * v_cycle_volume;
        v_commission_amount := v_cycles_matched * v_cycle_commission;

        UPDATE public.binary_network
        SET left_volume = GREATEST(0, left_volume - v_used_volume),
            right_volume = GREATEST(0, right_volume - v_used_volume),
            total_cycles = COALESCE(total_cycles, 0) + v_cycles_matched,
            updated_at = now()
        WHERE id = v_parent_node_id;

        INSERT INTO public.binary_commissions (user_id, amount, cycles_matched, left_volume_used, right_volume_used, created_at)
        VALUES (v_parent_user_id, v_commission_amount, v_cycles_matched, v_used_volume, v_used_volume, now());

        SELECT bde.id INTO v_daily_id FROM public.binary_daily_earnings bde
        WHERE bde.user_id = v_parent_user_id AND bde.earning_date = v_earning_date;

        IF FOUND THEN
          UPDATE public.binary_daily_earnings
          SET total_earned = COALESCE(total_earned, 0) + v_commission_amount,
              cycles_completed = COALESCE(cycles_completed, 0) + v_cycles_matched, updated_at = now()
          WHERE id = v_daily_id;
        ELSE
          INSERT INTO public.binary_daily_earnings (user_id, earning_date, total_earned, cycles_completed, created_at, updated_at)
          VALUES (v_parent_user_id, v_earning_date, v_commission_amount, v_cycles_matched, now(), now());
        END IF;

        SELECT COALESCE(bn.left_volume, 0), COALESCE(bn.right_volume, 0) INTO v_left_volume, v_right_volume
        FROM public.binary_network bn WHERE bn.id = v_parent_node_id;
      END IF;
    END IF;

    v_child_node_id := v_parent_node_id;
    v_parent_node_id := v_parent_parent_id;
  END LOOP;

  PERFORM set_config('row_security', 'on', true);
END;
$$;