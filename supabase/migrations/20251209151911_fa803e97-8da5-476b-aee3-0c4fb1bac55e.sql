-- Fix the function to use proper date format
CREATE OR REPLACE FUNCTION public.distribute_order_commissions()
RETURNS TRIGGER AS $$
DECLARE
  v_buyer_id UUID;
  v_order_amount NUMERIC;
  v_current_upline_id UUID;
  v_level INTEGER := 1;
  v_commission_amount NUMERIC;
  v_buyer_rank INTEGER;
  v_upline_rank INTEGER;
  v_upline_percentage NUMERIC;
  v_buyer_percentage NUMERIC;
  v_stair_step_commission NUMERIC;
  v_total_diamonds INTEGER;
  v_diamond_price NUMERIC := 10.00;
  v_unilevel_percentage NUMERIC := 40;
  v_stairstep_percentage NUMERIC := 35;
  v_leadership_percentage NUMERIC := 25;
  v_available_commission_pool NUMERIC;
  v_unilevel_rates NUMERIC[] := ARRAY[0.10, 0.05, 0.05, 0.035, 0.035, 0.025, 0.025];
  v_current_month DATE;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_buyer_id := NEW.user_id;
    v_order_amount := NEW.total_amount;
    v_total_diamonds := COALESCE(NEW.total_diamond_credits, 0);
    v_current_month := date_trunc('month', now())::date;
    
    v_available_commission_pool := v_total_diamonds * v_diamond_price;
    
    SELECT COALESCE(current_step, 0) INTO v_buyer_rank
    FROM public.affiliate_current_rank
    WHERE user_id = v_buyer_id;
    
    IF v_buyer_rank IS NULL THEN
      v_buyer_rank := 0;
    END IF;
    
    SELECT COALESCE(commission_percentage, 0) INTO v_buyer_percentage
    FROM public.stair_step_config
    WHERE step_number = v_buyer_rank AND active = true;
    
    IF v_buyer_percentage IS NULL THEN
      v_buyer_percentage := 0;
    END IF;
    
    SELECT referred_by INTO v_current_upline_id
    FROM public.profiles
    WHERE id = v_buyer_id;
    
    WHILE v_current_upline_id IS NOT NULL AND v_level <= 7 LOOP
      
      -- 1. UNILEVEL COMMISSION
      v_commission_amount := v_order_amount * v_unilevel_rates[v_level] * (v_unilevel_percentage / 100);
      
      IF v_commission_amount > 0 THEN
        INSERT INTO public.commissions (
          user_id, from_user_id, amount, level, commission_type, notes
        ) VALUES (
          v_current_upline_id, 
          v_buyer_id, 
          v_commission_amount, 
          v_level,
          'unilevel_commission',
          'Unilevel commission from level ' || v_level || ' order delivery (Order: ' || NEW.order_number || ')'
        );
        
        UPDATE public.user_wallets
        SET balance = balance + v_commission_amount,
            total_commissions = COALESCE(total_commissions, 0) + v_commission_amount,
            updated_at = now()
        WHERE user_id = v_current_upline_id;
      END IF;
      
      -- 2. STAIR STEP COMMISSION
      SELECT COALESCE(acr.current_step, 0), COALESCE(ssc.commission_percentage, 0)
      INTO v_upline_rank, v_upline_percentage
      FROM public.profiles p
      LEFT JOIN public.affiliate_current_rank acr ON acr.user_id = p.id
      LEFT JOIN public.stair_step_config ssc ON ssc.step_number = acr.current_step AND ssc.active = true
      WHERE p.id = v_current_upline_id;
      
      IF v_upline_rank IS NULL THEN
        v_upline_rank := 0;
        v_upline_percentage := 0;
      END IF;
      
      IF v_upline_rank > v_buyer_rank AND v_upline_percentage > v_buyer_percentage THEN
        v_stair_step_commission := v_order_amount * ((v_upline_percentage - v_buyer_percentage) / 100) * (v_stairstep_percentage / 100);
        
        IF v_stair_step_commission > 0 THEN
          INSERT INTO public.commissions (
            user_id, from_user_id, amount, level, commission_type, notes
          ) VALUES (
            v_current_upline_id,
            v_buyer_id,
            v_stair_step_commission,
            v_level,
            'stairstep_commission',
            'Stair-step commission (' || v_upline_percentage || '% - ' || v_buyer_percentage || '%) from Order: ' || NEW.order_number
          );
          
          UPDATE public.user_wallets
          SET balance = balance + v_stair_step_commission,
              total_commissions = COALESCE(total_commissions, 0) + v_stair_step_commission,
              updated_at = now()
          WHERE user_id = v_current_upline_id;
        END IF;
      END IF;
      
      -- 3. LEADERSHIP BREAKAWAY BONUS
      IF v_upline_rank >= 7 AND v_buyer_rank >= 7 THEN
        DECLARE
          v_breakaway_percentage NUMERIC;
        BEGIN
          SELECT COALESCE(breakaway_percentage, 2.00) INTO v_breakaway_percentage
          FROM public.stair_step_config
          WHERE step_number = v_upline_rank AND active = true;
          
          IF v_breakaway_percentage > 0 THEN
            v_commission_amount := v_order_amount * (v_breakaway_percentage / 100) * (v_leadership_percentage / 100);
            
            IF v_commission_amount > 0 THEN
              INSERT INTO public.leadership_commissions (
                upline_id, downline_id, amount, level, sales_amount, 
                commission_type, order_id, notes
              ) VALUES (
                v_current_upline_id,
                v_buyer_id,
                v_commission_amount,
                v_level,
                v_order_amount,
                'leadership_breakaway',
                NEW.id,
                'Leadership breakaway bonus (' || v_breakaway_percentage || '%) from level ' || v_level || ' leader'
              );
              
              UPDATE public.user_wallets
              SET balance = balance + v_commission_amount,
                  total_commissions = COALESCE(total_commissions, 0) + v_commission_amount,
                  updated_at = now()
              WHERE user_id = v_current_upline_id;
            END IF;
          END IF;
        END;
      END IF;
      
      v_buyer_percentage := v_upline_percentage;
      v_buyer_rank := v_upline_rank;
      
      SELECT referred_by INTO v_current_upline_id
      FROM public.profiles
      WHERE id = v_current_upline_id;
      
      v_level := v_level + 1;
    END LOOP;
    
    -- Update affiliate monthly sales with proper date type
    INSERT INTO public.affiliate_monthly_sales (
      user_id, sales_month, personal_sales, team_sales, total_sales
    ) VALUES (
      v_buyer_id,
      v_current_month,
      v_order_amount,
      0,
      v_order_amount
    )
    ON CONFLICT (user_id, sales_month) 
    DO UPDATE SET 
      personal_sales = affiliate_monthly_sales.personal_sales + v_order_amount,
      total_sales = affiliate_monthly_sales.total_sales + v_order_amount,
      updated_at = now();
    
    PERFORM public.check_and_update_affiliate_rank(v_buyer_id);
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also fix search_path for other function
CREATE OR REPLACE FUNCTION public.check_and_update_affiliate_rank(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_current_month DATE;
  v_total_sales NUMERIC;
  v_current_rank INTEGER;
  v_new_rank INTEGER;
BEGIN
  v_current_month := date_trunc('month', now())::date;
  
  SELECT COALESCE(total_sales, 0) INTO v_total_sales
  FROM public.affiliate_monthly_sales
  WHERE user_id = p_user_id AND sales_month = v_current_month;
  
  IF v_total_sales IS NULL THEN
    v_total_sales := 0;
  END IF;
  
  SELECT COALESCE(current_step, 0) INTO v_current_rank
  FROM public.affiliate_current_rank
  WHERE user_id = p_user_id;
  
  IF v_current_rank IS NULL THEN
    v_current_rank := 0;
  END IF;
  
  SELECT COALESCE(MAX(step_number), 0) INTO v_new_rank
  FROM public.stair_step_config
  WHERE active = true AND sales_quota <= v_total_sales;
  
  IF v_new_rank > v_current_rank THEN
    INSERT INTO public.affiliate_current_rank (
      user_id, current_step, qualification_count, last_qualified_at
    ) VALUES (
      p_user_id, v_new_rank, 1, now()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET 
      current_step = v_new_rank,
      qualification_count = affiliate_current_rank.qualification_count + 1,
      last_qualified_at = now(),
      updated_at = now();
    
    INSERT INTO public.affiliate_rank_history (
      user_id, step_number, qualified_month, sales_volume, qualification_count
    ) VALUES (
      p_user_id, v_new_rank, v_current_month::text, v_total_sales, 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;