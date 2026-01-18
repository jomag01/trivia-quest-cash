-- Update the distribute_ad_revenue function to properly distribute to all MLM networks
CREATE OR REPLACE FUNCTION public.distribute_ad_revenue(
  p_ad_id UUID,
  p_seller_id UUID,
  p_total_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_percentage NUMERIC;
  v_unilevel_percentage NUMERIC;
  v_stairstep_percentage NUMERIC;
  v_leadership_percentage NUMERIC;
  v_admin_profit INTEGER;
  v_unilevel_pool INTEGER;
  v_stairstep_pool INTEGER;
  v_leadership_pool INTEGER;
  v_upline_id UUID;
  v_level INTEGER := 1;
  v_commission_rate NUMERIC;
  v_commission_amount INTEGER;
  v_unilevel_distributed INTEGER := 0;
  v_stairstep_distributed INTEGER := 0;
  v_leadership_distributed INTEGER := 0;
  v_referrer_id UUID;
  v_referrer_step INTEGER;
  v_step_percentage NUMERIC;
  v_manager_id UUID;
  v_manager_level INTEGER;
BEGIN
  -- Get revenue distribution percentages from admin settings
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'admin_net_profit_percentage'),
    40
  ) INTO v_admin_percentage;
  
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'unilevel_pool_percentage'),
    25
  ) INTO v_unilevel_percentage;
  
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'stairstep_pool_percentage'),
    20
  ) INTO v_stairstep_percentage;
  
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'leadership_pool_percentage'),
    15
  ) INTO v_leadership_percentage;

  -- Calculate pool amounts in diamonds
  v_admin_profit := FLOOR(p_total_amount * v_admin_percentage / 100);
  v_unilevel_pool := FLOOR(p_total_amount * v_unilevel_percentage / 100);
  v_stairstep_pool := FLOOR(p_total_amount * v_stairstep_percentage / 100);
  v_leadership_pool := FLOOR(p_total_amount * v_leadership_percentage / 100);

  -- ============ UNILEVEL DISTRIBUTION (7 levels) ============
  SELECT referred_by INTO v_upline_id FROM profiles WHERE id = p_seller_id;

  WHILE v_upline_id IS NOT NULL AND v_level <= 7 LOOP
    -- Get commission rate for this level from settings
    SELECT COALESCE(
      (SELECT commission_percentage FROM unilevel_commission_rates WHERE level_number = v_level),
      CASE v_level
        WHEN 1 THEN 4.0
        WHEN 2 THEN 3.0
        WHEN 3 THEN 2.5
        WHEN 4 THEN 2.0
        WHEN 5 THEN 1.5
        WHEN 6 THEN 1.0
        WHEN 7 THEN 0.5
        ELSE 0
      END
    ) INTO v_commission_rate;

    -- Calculate commission as percentage of the unilevel pool
    v_commission_amount := FLOOR(v_unilevel_pool * v_commission_rate / 14.5);

    IF v_commission_amount > 0 THEN
      -- Add to user's diamond balance
      UPDATE profiles
      SET diamonds = COALESCE(diamonds, 0) + v_commission_amount
      WHERE id = v_upline_id;

      -- Record commission in commissions table
      INSERT INTO commissions (user_id, amount, commission_type, description, related_order_id)
      VALUES (v_upline_id, v_commission_amount, 'unilevel', 'Ad Revenue - Level ' || v_level, p_ad_id);

      -- Create notification
      INSERT INTO commission_notifications (user_id, amount, commission_type, source_type, source_id, message)
      VALUES (v_upline_id, v_commission_amount, 'unilevel', 'ad_purchase', p_ad_id, 
              'Earned ' || v_commission_amount || ' diamonds from ad purchase (Level ' || v_level || ')');

      v_unilevel_distributed := v_unilevel_distributed + v_commission_amount;
    END IF;

    -- Move to next upline
    SELECT referred_by INTO v_upline_id FROM profiles WHERE id = v_upline_id;
    v_level := v_level + 1;
  END LOOP;

  -- ============ STAIRSTEP DISTRIBUTION ============
  -- Get the seller's current step rank
  SELECT current_step INTO v_referrer_step 
  FROM affiliate_current_rank 
  WHERE user_id = p_seller_id;
  
  IF v_referrer_step IS NULL THEN v_referrer_step := 0; END IF;

  -- Find uplines with higher steps and distribute bonuses
  v_upline_id := (SELECT referred_by FROM profiles WHERE id = p_seller_id);
  v_level := 1;
  
  WHILE v_upline_id IS NOT NULL AND v_level <= 5 LOOP
    DECLARE
      v_upline_step INTEGER;
    BEGIN
      SELECT COALESCE(current_step, 0) INTO v_upline_step 
      FROM affiliate_current_rank 
      WHERE user_id = v_upline_id;
      
      IF v_upline_step IS NULL THEN v_upline_step := 0; END IF;
      
      -- If upline has higher step, they get stairstep bonus
      IF v_upline_step > v_referrer_step THEN
        -- Get step bonus percentage based on step difference
        SELECT COALESCE(personal_bonus_percentage, 2.0) INTO v_step_percentage
        FROM stair_step_levels
        WHERE step_number = v_upline_step
        LIMIT 1;
        
        v_commission_amount := FLOOR(v_stairstep_pool * v_step_percentage / 100);
        
        IF v_commission_amount > 0 THEN
          UPDATE profiles
          SET diamonds = COALESCE(diamonds, 0) + v_commission_amount
          WHERE id = v_upline_id;
          
          INSERT INTO commissions (user_id, amount, commission_type, description, related_order_id)
          VALUES (v_upline_id, v_commission_amount, 'stairstep', 'Ad Revenue - Stairstep Bonus', p_ad_id);
          
          INSERT INTO commission_notifications (user_id, amount, commission_type, source_type, source_id, message)
          VALUES (v_upline_id, v_commission_amount, 'stairstep', 'ad_purchase', p_ad_id,
                  'Earned ' || v_commission_amount || ' diamonds stairstep bonus from ad purchase');
          
          v_stairstep_distributed := v_stairstep_distributed + v_commission_amount;
          v_referrer_step := v_upline_step; -- Update for next comparison
        END IF;
      END IF;
    END;
    
    SELECT referred_by INTO v_upline_id FROM profiles WHERE id = v_upline_id;
    v_level := v_level + 1;
  END LOOP;

  -- ============ LEADERSHIP DISTRIBUTION ============
  -- Find managers in the upline (users with manager status)
  v_upline_id := (SELECT referred_by FROM profiles WHERE id = p_seller_id);
  v_manager_level := 0;
  
  WHILE v_upline_id IS NOT NULL AND v_manager_level < 3 LOOP
    DECLARE
      v_is_manager BOOLEAN;
      v_leadership_rate NUMERIC := 2.0; -- Default 2% for managers
    BEGIN
      -- Check if this upline is a manager (step 5 or higher)
      SELECT COALESCE(current_step, 0) >= 5 INTO v_is_manager
      FROM affiliate_current_rank
      WHERE user_id = v_upline_id;
      
      IF v_is_manager THEN
        v_manager_level := v_manager_level + 1;
        v_commission_amount := FLOOR(v_leadership_pool * v_leadership_rate / 100 * (4 - v_manager_level));
        
        IF v_commission_amount > 0 THEN
          UPDATE profiles
          SET diamonds = COALESCE(diamonds, 0) + v_commission_amount
          WHERE id = v_upline_id;
          
          INSERT INTO commissions (user_id, amount, commission_type, description, related_order_id)
          VALUES (v_upline_id, v_commission_amount, 'leadership', 'Ad Revenue - Leadership Bonus', p_ad_id);
          
          INSERT INTO commission_notifications (user_id, amount, commission_type, source_type, source_id, message)
          VALUES (v_upline_id, v_commission_amount, 'leadership', 'ad_purchase', p_ad_id,
                  'Earned ' || v_commission_amount || ' diamonds leadership bonus from ad purchase');
          
          v_leadership_distributed := v_leadership_distributed + v_commission_amount;
        END IF;
      END IF;
    END;
    
    SELECT referred_by INTO v_upline_id FROM profiles WHERE id = v_upline_id;
  END LOOP;

  -- Record the revenue distribution for tracking
  INSERT INTO ad_revenue_distributions (
    ad_id,
    seller_id,
    total_revenue,
    admin_profit,
    unilevel_distributed,
    stairstep_distributed,
    leadership_distributed,
    processed_at
  ) VALUES (
    p_ad_id,
    p_seller_id,
    p_total_amount,
    v_admin_profit,
    v_unilevel_distributed,
    v_stairstep_distributed,
    v_leadership_distributed,
    NOW()
  );

END;
$$;