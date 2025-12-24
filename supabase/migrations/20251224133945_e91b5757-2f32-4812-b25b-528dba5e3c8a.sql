
-- Drop existing function and recreate with correct cycle logic
DROP FUNCTION IF EXISTS public.binary_apply_purchase_volume(UUID, NUMERIC);

-- Recreate with fixed cycle volume of 11,960 per leg
CREATE OR REPLACE FUNCTION public.binary_apply_purchase_volume(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sponsor_id UUID;
  v_current_user_id UUID;
  v_placement_leg TEXT;
  v_network_record RECORD;
  v_left_volume NUMERIC;
  v_right_volume NUMERIC;
  v_weaker_leg NUMERIC;
  v_cycles_completed INTEGER;
  v_cycle_volume NUMERIC := 11960; -- Fixed: 11,960 per leg to cycle
  v_cycle_commission_percent NUMERIC;
  v_commission_per_cycle NUMERIC;
  v_total_commission NUMERIC := 0;
  v_daily_cap NUMERIC;
  v_today_earnings NUMERIC;
  v_remaining_cap NUMERIC;
  v_final_commission NUMERIC;
  v_user_tier INTEGER;
  v_user_purchase_amount NUMERIC;
  v_ai_cost_percent NUMERIC;
  v_admin_profit_percent NUMERIC;
  v_direct_referral_percent NUMERIC := 5;
  v_matched_volume NUMERIC;
  v_total_deductions NUMERIC;
  v_distributable_amount NUMERIC;
BEGIN
  -- Get the sponsor from binary_network
  SELECT sponsor_id INTO v_sponsor_id
  FROM binary_network
  WHERE user_id = p_user_id;

  -- If no sponsor, just add volume to user's own position
  IF v_sponsor_id IS NULL THEN
    UPDATE binary_network
    SET updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'message', 'No sponsor found, volume added to own position');
  END IF;

  -- Get placement leg
  SELECT placement_leg INTO v_placement_leg
  FROM binary_network
  WHERE user_id = p_user_id;

  -- Add volume to upline chain
  v_current_user_id := v_sponsor_id;
  
  WHILE v_current_user_id IS NOT NULL LOOP
    -- Update volume based on which leg the purchase came from
    IF v_placement_leg = 'left' THEN
      UPDATE binary_network
      SET left_volume = COALESCE(left_volume, 0) + p_amount,
          updated_at = now()
      WHERE user_id = v_current_user_id;
    ELSE
      UPDATE binary_network
      SET right_volume = COALESCE(right_volume, 0) + p_amount,
          updated_at = now()
      WHERE user_id = v_current_user_id;
    END IF;

    -- Get updated volumes and check for cycles
    SELECT * INTO v_network_record
    FROM binary_network
    WHERE user_id = v_current_user_id;

    v_left_volume := COALESCE(v_network_record.left_volume, 0);
    v_right_volume := COALESCE(v_network_record.right_volume, 0);

    -- Calculate cycles: Fixed 11,960 per leg required
    -- Examples: 4×₱2,990=11,960 OR 2×₱5,990=11,980 OR 1×₱11,960
    -- A cycle = when both legs have at least 11,960
    v_weaker_leg := LEAST(v_left_volume, v_right_volume);
    v_cycles_completed := FLOOR(v_weaker_leg / v_cycle_volume);

    IF v_cycles_completed > 0 THEN
      -- Get user's tier based on their purchase amount
      SELECT amount INTO v_user_purchase_amount
      FROM binary_ai_purchases
      WHERE user_id = v_current_user_id
        AND status = 'approved'
      ORDER BY created_at DESC
      LIMIT 1;

      -- Determine tier index (0 = starter, 1 = pro, 2 = elite)
      IF v_user_purchase_amount >= 11960 THEN
        v_user_tier := 2;
      ELSIF v_user_purchase_amount >= 5990 THEN
        v_user_tier := 1;
      ELSE
        v_user_tier := 0;
      END IF;

      -- Get tier-specific daily cap
      SELECT COALESCE(value::NUMERIC, 1500) INTO v_daily_cap
      FROM app_settings
      WHERE key = 'ai_credit_tier_' || v_user_tier || '_daily_cap';

      IF v_daily_cap IS NULL THEN
        v_daily_cap := CASE v_user_tier
          WHEN 2 THEN 9000
          WHEN 1 THEN 3000
          ELSE 1500
        END;
      END IF;

      -- Get cycle commission percent (default 10%)
      SELECT COALESCE(value::NUMERIC, 10) INTO v_cycle_commission_percent
      FROM app_settings
      WHERE key = 'binary_cycle_commission_percent';

      -- Get AI cost percent
      SELECT COALESCE(value::NUMERIC, 30) INTO v_ai_cost_percent
      FROM app_settings
      WHERE key = 'binary_ai_cost_percent';

      -- Get admin profit percent
      SELECT COALESCE(value::NUMERIC, 10) INTO v_admin_profit_percent
      FROM app_settings
      WHERE key = 'binary_admin_profit_percent';

      -- Matched volume per cycle = 11,960 × 2 (both legs)
      v_matched_volume := v_cycles_completed * v_cycle_volume * 2;

      -- Calculate deductions from matched volume
      v_total_deductions := v_matched_volume * ((v_ai_cost_percent + v_admin_profit_percent + v_direct_referral_percent) / 100);
      v_distributable_amount := v_matched_volume - v_total_deductions;

      -- Commission is percentage of distributable amount
      v_total_commission := v_distributable_amount * v_cycle_commission_percent / 100;

      -- Check daily cap
      SELECT COALESCE(SUM(total_earned), 0) INTO v_today_earnings
      FROM binary_daily_earnings
      WHERE user_id = v_current_user_id
        AND earning_date = CURRENT_DATE;

      v_remaining_cap := v_daily_cap - v_today_earnings;
      v_final_commission := LEAST(v_total_commission, GREATEST(v_remaining_cap, 0));

      IF v_final_commission > 0 THEN
        -- Deduct used volume from both legs
        UPDATE binary_network
        SET left_volume = left_volume - (v_cycles_completed * v_cycle_volume),
            right_volume = right_volume - (v_cycles_completed * v_cycle_volume),
            total_cycles = COALESCE(total_cycles, 0) + v_cycles_completed,
            updated_at = now()
        WHERE user_id = v_current_user_id;

        -- Record commission
        INSERT INTO binary_commissions (
          user_id,
          amount,
          cycles_matched,
          left_volume_used,
          right_volume_used,
          created_at
        ) VALUES (
          v_current_user_id,
          v_final_commission,
          v_cycles_completed,
          v_cycles_completed * v_cycle_volume,
          v_cycles_completed * v_cycle_volume,
          now()
        );

        -- Update daily earnings
        INSERT INTO binary_daily_earnings (user_id, earning_date, total_earned, cycles_completed)
        VALUES (v_current_user_id, CURRENT_DATE, v_final_commission, v_cycles_completed)
        ON CONFLICT (user_id, earning_date)
        DO UPDATE SET
          total_earned = binary_daily_earnings.total_earned + EXCLUDED.total_earned,
          cycles_completed = binary_daily_earnings.cycles_completed + EXCLUDED.cycles_completed,
          updated_at = now();

        -- Update user credits
        UPDATE profiles
        SET credits = COALESCE(credits, 0) + v_final_commission
        WHERE id = v_current_user_id;
      END IF;
    END IF;

    -- Move up the tree
    SELECT parent_id INTO v_current_user_id
    FROM binary_network
    WHERE user_id = v_current_user_id;

    -- Get the placement leg for the next iteration
    IF v_current_user_id IS NOT NULL THEN
      SELECT placement_leg INTO v_placement_leg
      FROM binary_network
      WHERE user_id = (SELECT user_id FROM binary_network WHERE parent_id = v_current_user_id LIMIT 1);
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'Volume applied and cycles processed');
END;
$$;
