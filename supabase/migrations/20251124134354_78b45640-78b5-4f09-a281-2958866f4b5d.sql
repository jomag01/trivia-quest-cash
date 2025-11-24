-- Create function to distribute diamonds through 7-level network for credit purchases
CREATE OR REPLACE FUNCTION public.distribute_network_diamonds(
  p_buyer_id UUID,
  p_amount NUMERIC,
  p_purchase_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_level INTEGER := 1;
  v_commission_rate NUMERIC;
  v_commission_diamonds INTEGER;
  v_commission_rates NUMERIC[] := ARRAY[10, 5, 3, 2, 1, 0.5, 0.5]; -- 7 levels
BEGIN
  v_current_user_id := (SELECT referred_by FROM public.profiles WHERE id = p_buyer_id);
  
  -- Loop through 7 levels
  WHILE v_current_user_id IS NOT NULL AND v_current_level <= 7 LOOP
    -- Get commission rate for this level
    v_commission_rate := v_commission_rates[v_current_level];
    
    -- Calculate diamonds to award (based on percentage of amount divided by diamond base price)
    v_commission_diamonds := FLOOR((p_amount * v_commission_rate / 100) / (
      SELECT setting_value::NUMERIC FROM public.treasure_admin_settings WHERE setting_key = 'diamond_base_price'
    ));
    
    -- Award diamonds if user meets earning requirements
    IF v_commission_diamonds > 0 AND public.user_meets_earning_requirements(v_current_user_id) THEN
      -- Add diamonds to treasure wallet
      INSERT INTO public.treasure_wallet (user_id, diamonds)
      VALUES (v_current_user_id, v_commission_diamonds)
      ON CONFLICT (user_id) DO UPDATE
      SET diamonds = treasure_wallet.diamonds + v_commission_diamonds,
          updated_at = now();
      
      -- Record commission in commissions table for tracking
      INSERT INTO public.commissions (
        user_id, 
        from_user_id, 
        amount, 
        level,
        commission_type,
        purchase_id,
        notes
      ) VALUES (
        v_current_user_id,
        p_buyer_id,
        v_commission_diamonds, -- Store diamond amount
        v_current_level,
        'network_diamond',
        p_purchase_id,
        format('%s diamonds from credit purchase', v_commission_diamonds)
      );
    END IF;
    
    -- Move to next level
    v_current_level := v_current_level + 1;
    v_current_user_id := (SELECT referred_by FROM public.profiles WHERE id = v_current_user_id);
  END LOOP;
END;
$$;

-- Create trigger function for credit purchase diamond distribution
CREATE OR REPLACE FUNCTION public.trigger_credit_purchase_diamonds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Distribute diamonds through network
    PERFORM public.distribute_network_diamonds(NEW.user_id, NEW.amount, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_credit_purchase_commission ON public.credit_purchases;

-- Create trigger on credit_purchases for diamond distribution
CREATE TRIGGER trigger_credit_purchase_commission
  AFTER INSERT OR UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_credit_purchase_diamonds();

-- Update distribute_stair_step_commissions to handle cash only (for product purchases)
CREATE OR REPLACE FUNCTION public.distribute_stair_step_commissions(
  p_buyer_id UUID,
  p_amount NUMERIC,
  p_purchase_id UUID,
  p_is_credit_purchase BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_rank INTEGER;
  v_upline_rank INTEGER;
  v_commission_amount NUMERIC;
  v_commission_percentage NUMERIC;
  v_level INTEGER := 1;
BEGIN
  -- Skip if this is a credit purchase (those use network diamonds instead)
  IF p_is_credit_purchase THEN
    RETURN;
  END IF;

  v_current_user_id := (SELECT referred_by FROM public.profiles WHERE id = p_buyer_id);
  
  -- Get buyer's current rank (default to 0 if none)
  SELECT COALESCE(current_step, 0) INTO v_current_rank
  FROM public.affiliate_current_rank
  WHERE user_id = p_buyer_id;
  
  -- Loop through uplines
  WHILE v_current_user_id IS NOT NULL AND v_level <= 7 LOOP
    -- Get upline's current rank
    SELECT COALESCE(acr.current_step, 0), ssc.commission_percentage
    INTO v_upline_rank, v_commission_percentage
    FROM public.affiliate_current_rank acr
    LEFT JOIN public.stair_step_config ssc ON ssc.step_number = acr.current_step AND ssc.active = true
    WHERE acr.user_id = v_current_user_id;
    
    -- Calculate commission if upline has higher rank and meets requirements
    IF v_upline_rank > v_current_rank AND 
       v_commission_percentage IS NOT NULL AND 
       public.user_meets_earning_requirements(v_current_user_id) THEN
       
      -- Calculate percentage difference
      DECLARE
        v_buyer_percentage NUMERIC := 0;
      BEGIN
        SELECT COALESCE(commission_percentage, 0) INTO v_buyer_percentage
        FROM public.stair_step_config
        WHERE step_number = v_current_rank AND active = true;
        
        v_commission_amount := p_amount * ((v_commission_percentage - v_buyer_percentage) / 100);
        
        -- Add to wallet balance (cash)
        UPDATE public.user_wallets
        SET balance = balance + v_commission_amount,
            total_commissions = COALESCE(total_commissions, 0) + v_commission_amount,
            updated_at = now()
        WHERE user_id = v_current_user_id;
        
        -- Record commission
        INSERT INTO public.commissions (
          user_id,
          from_user_id,
          amount,
          level,
          commission_type,
          purchase_id,
          notes
        ) VALUES (
          v_current_user_id,
          p_buyer_id,
          v_commission_amount,
          v_level,
          'stair_step_cash',
          p_purchase_id,
          format('Stair-step commission: %s%% - %s%% = %s%%', 
                 v_commission_percentage, v_buyer_percentage, 
                 v_commission_percentage - v_buyer_percentage)
        );
      END;
    END IF;
    
    -- Move to next upline
    v_level := v_level + 1;
    v_current_rank := v_upline_rank; -- Current rank becomes the upline rank for next iteration
    v_current_user_id := (SELECT referred_by FROM public.profiles WHERE id = v_current_user_id);
  END LOOP;
END;
$$;

-- Update trigger function for order delivery to use stair-step commissions (cash)
CREATE OR REPLACE FUNCTION public.trigger_order_commissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    -- Distribute cash commissions through stair-step plan
    PERFORM public.distribute_stair_step_commissions(
      NEW.user_id, 
      NEW.total_amount, 
      NEW.id,
      false -- Not a credit purchase
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger on orders
DROP TRIGGER IF EXISTS trigger_order_commission ON public.orders;

CREATE TRIGGER trigger_order_commission
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_order_commissions();