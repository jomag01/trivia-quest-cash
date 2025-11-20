-- Update seller requirement to 2 referrals instead of 10
CREATE OR REPLACE FUNCTION public.can_become_seller(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) >= 2
  FROM public.referrals
  WHERE referrer_id = p_user_id;
$$;

-- Add approval_status to products for admin approval workflow
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Add game entry costs and penalties to game_categories
ALTER TABLE public.game_categories
ADD COLUMN IF NOT EXISTS entry_cost_diamonds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS wrong_answer_penalty integer DEFAULT 0;

-- Add admin settings for withdrawal and earning requirements
INSERT INTO public.treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  ('min_purchase_diamonds_for_earnings', '150', 'Minimum diamonds from product purchases required to earn commissions and withdraw'),
  ('min_referrals_for_earnings', '2', 'Minimum referrals required to earn commissions at level 5+')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value, 
    description = EXCLUDED.description;

-- Function to check if user meets earning requirements
CREATE OR REPLACE FUNCTION public.user_meets_earning_requirements(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_count integer;
  v_total_diamonds_from_purchases numeric;
  v_min_diamonds integer;
  v_min_referrals integer;
BEGIN
  -- Get minimum requirements from settings
  SELECT setting_value::integer INTO v_min_diamonds
  FROM public.treasure_admin_settings
  WHERE setting_key = 'min_purchase_diamonds_for_earnings';
  
  SELECT setting_value::integer INTO v_min_referrals
  FROM public.treasure_admin_settings
  WHERE setting_key = 'min_referrals_for_earnings';
  
  -- Count referrals
  SELECT COUNT(*) INTO v_referral_count
  FROM public.referrals
  WHERE referrer_id = p_user_id;
  
  -- Calculate total diamonds earned from product purchases
  SELECT COALESCE(SUM(oi.quantity * p.diamond_reward), 0) INTO v_total_diamonds_from_purchases
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.products p ON p.id = oi.product_id
  WHERE o.user_id = p_user_id
    AND o.status = 'delivered'
    AND p.diamond_reward IS NOT NULL
    AND p.diamond_reward > 0;
  
  -- Return true if both requirements are met
  RETURN v_referral_count >= v_min_referrals AND v_total_diamonds_from_purchases >= v_min_diamonds;
END;
$$;

-- Update distribute_multivendor_commissions to check earning requirements
CREATE OR REPLACE FUNCTION public.distribute_multivendor_commissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product record;
  v_markup_amount numeric;
  v_admin_profit numeric;
  v_commission_pool numeric;
  v_buyer_upline_id uuid;
BEGIN
  -- Only process delivered orders
  IF NEW.status != 'delivered' THEN
    RETURN NEW;
  END IF;

  -- Process each product in the order
  FOR v_product IN
    SELECT p.*, oi.quantity, oi.subtotal
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.id
      AND p.seller_id IS NOT NULL  -- Only user-created products
      AND p.admin_markup_percentage IS NOT NULL
      AND p.admin_markup_percentage > 0
  LOOP
    -- Calculate markup amount
    v_markup_amount := v_product.wholesale_price * (v_product.admin_markup_percentage / 100.0) * v_product.quantity;
    
    -- If markup >= 200%, split 35% admin / 65% commission
    IF v_product.admin_markup_percentage >= 200 THEN
      v_admin_profit := v_markup_amount * 0.35;
      v_commission_pool := v_markup_amount * 0.65;
    ELSE
      -- Below 200%, all markup goes to commission pool
      v_admin_profit := 0;
      v_commission_pool := v_markup_amount;
    END IF;

    -- Get buyer's upline (referred_by)
    SELECT referred_by INTO v_buyer_upline_id
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Only distribute commissions if buyer has an upline AND upline meets earning requirements
    IF v_buyer_upline_id IS NOT NULL AND public.user_meets_earning_requirements(v_buyer_upline_id) THEN
      -- Use existing stair-step commission distribution
      PERFORM public.distribute_stair_step_commissions(
        NEW.user_id,
        v_commission_pool,
        NEW.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger to deduct diamonds when starting a game level
CREATE OR REPLACE FUNCTION public.deduct_game_entry_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_cost integer;
  v_current_diamonds integer;
BEGIN
  -- Get entry cost for this category
  SELECT entry_cost_diamonds INTO v_entry_cost
  FROM public.game_categories
  WHERE id = NEW.category_id;
  
  -- If no entry cost, allow entry
  IF v_entry_cost IS NULL OR v_entry_cost = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get user's current diamonds
  SELECT diamonds INTO v_current_diamonds
  FROM public.treasure_wallet
  WHERE user_id = NEW.user_id;
  
  -- Check if user has enough diamonds
  IF v_current_diamonds < v_entry_cost THEN
    RAISE EXCEPTION 'Insufficient diamonds. You need % diamonds to play this category.', v_entry_cost;
  END IF;
  
  -- Deduct entry cost
  UPDATE public.treasure_wallet
  SET diamonds = diamonds - v_entry_cost,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to game_level_completions (fires before insert)
DROP TRIGGER IF EXISTS trigger_deduct_game_entry_cost ON public.game_level_completions;
CREATE TRIGGER trigger_deduct_game_entry_cost
  BEFORE INSERT ON public.game_level_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_game_entry_cost();

-- Function to deduct diamonds on wrong answers
CREATE OR REPLACE FUNCTION public.deduct_wrong_answer_penalty(
  p_user_id uuid,
  p_category_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_penalty integer;
BEGIN
  -- Get penalty for this category
  SELECT wrong_answer_penalty INTO v_penalty
  FROM public.game_categories
  WHERE id = p_category_id;
  
  -- If no penalty, do nothing
  IF v_penalty IS NULL OR v_penalty = 0 THEN
    RETURN;
  END IF;
  
  -- Deduct penalty (don't go below 0)
  UPDATE public.treasure_wallet
  SET diamonds = GREATEST(0, diamonds - v_penalty),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;