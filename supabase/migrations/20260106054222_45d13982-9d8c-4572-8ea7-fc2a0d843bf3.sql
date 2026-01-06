-- Fix the commission distribution function to include related_order_id (retry)
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
  v_hold_days INTEGER := 15;
  v_hold_until TIMESTAMPTZ;
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_buyer_id := NEW.user_id;
    v_order_amount := NEW.total_amount;
    v_total_diamonds := COALESCE(NEW.total_diamond_credits, 0);
    v_current_month := date_trunc('month', now())::date;
    v_hold_until := now() + (v_hold_days || ' days')::interval;
    
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
          user_id, from_user_id, amount, level, commission_type, notes,
          related_order_id, hold_status, hold_until, hold_reason
        ) VALUES (
          v_current_upline_id, 
          v_buyer_id, 
          v_commission_amount, 
          v_level,
          'unilevel',
          'Unilevel commission from level ' || v_level || ' order delivery (Order: ' || NEW.order_number || ')',
          NEW.id,
          'held',
          v_hold_until,
          '15-day hold for return protection'
        );
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
            user_id, from_user_id, amount, level, commission_type, notes,
            related_order_id, hold_status, hold_until, hold_reason
          ) VALUES (
            v_current_upline_id,
            v_buyer_id,
            v_stair_step_commission,
            v_level,
            'stairstep',
            'Stair-step commission (' || v_upline_percentage || '% - ' || v_buyer_percentage || '%) from Order: ' || NEW.order_number,
            NEW.id,
            'held',
            v_hold_until,
            '15-day hold for return protection'
          );
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
              INSERT INTO public.commissions (
                user_id, from_user_id, amount, level, commission_type, notes,
                related_order_id, hold_status, hold_until, hold_reason
              ) VALUES (
                v_current_upline_id,
                v_buyer_id,
                v_commission_amount,
                v_level,
                'leadership',
                'Leadership breakaway bonus (' || v_breakaway_percentage || '%) from level ' || v_level || ' leader (Order: ' || NEW.order_number || ')',
                NEW.id,
                'held',
                v_hold_until,
                '15-day hold for return protection'
              );
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
    
    -- Update affiliate monthly sales
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
    
    UPDATE public.orders SET commission_status = 'pending' WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create notifications when commissions are inserted
CREATE OR REPLACE FUNCTION public.notify_commission_earned()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.commission_notifications (
    user_id, 
    commission_id, 
    commission_type, 
    amount, 
    source_type,
    message
  ) VALUES (
    NEW.user_id,
    NEW.id,
    NEW.commission_type,
    NEW.amount,
    CASE 
      WHEN NEW.commission_type = 'unilevel' THEN 'Unilevel Network'
      WHEN NEW.commission_type = 'stairstep' THEN 'Stair-Step MLM'
      WHEN NEW.commission_type = 'leadership' THEN 'Leadership Breakaway'
      WHEN NEW.commission_type = 'seller_referrer' THEN 'Seller Referral'
      WHEN NEW.commission_type LIKE '%binary%' OR NEW.commission_type LIKE '%beehive%' THEN 'AI Beehives'
      ELSE 'Commission'
    END,
    'You earned ₱' || NEW.amount::text || ' from ' || 
    CASE 
      WHEN NEW.commission_type = 'unilevel' THEN 'Unilevel Network (Level ' || COALESCE(NEW.level::text, '1') || ')'
      WHEN NEW.commission_type = 'stairstep' THEN 'Stair-Step MLM'
      WHEN NEW.commission_type = 'leadership' THEN 'Leadership Breakaway'
      WHEN NEW.commission_type = 'seller_referrer' THEN 'Seller Referral'
      WHEN NEW.commission_type LIKE '%binary%' OR NEW.commission_type LIKE '%beehive%' THEN 'AI Beehives Match'
      ELSE NEW.commission_type
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_commission ON public.commissions;
CREATE TRIGGER trigger_notify_commission
  AFTER INSERT ON public.commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_commission_earned();