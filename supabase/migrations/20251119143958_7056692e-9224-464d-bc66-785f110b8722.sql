-- Fix diamond crediting so order updates no longer fail due to diamond_transactions schema

-- 1) Remove the redundant order-delivered trigger/function that we no longer need
DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
DROP FUNCTION IF EXISTS public.handle_order_delivered();

-- 2) Rewrite credit_diamonds_on_delivery to use update_treasure_wallet and NOT diamond_transactions
CREATE OR REPLACE FUNCTION public.credit_diamonds_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_diamonds integer := 0;
  v_item RECORD;
BEGIN
  -- Only proceed if status changed to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_user_id := NEW.user_id;

    -- Skip if no user_id (guest order)
    IF v_user_id IS NULL THEN
      RETURN NEW;
    END IF;

    v_total_diamonds := 0;

    -- Calculate total diamonds from all order items
    FOR v_item IN 
      SELECT oi.quantity, p.diamond_reward
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
    LOOP
      v_total_diamonds := v_total_diamonds + (COALESCE(v_item.diamond_reward, 0) * v_item.quantity);
    END LOOP;

    -- Store total diamonds on the order record
    UPDATE public.orders 
    SET total_diamond_credits = v_total_diamonds 
    WHERE id = NEW.id;

    -- Credit diamonds to the user's treasure wallet
    IF v_total_diamonds > 0 THEN
      PERFORM public.update_treasure_wallet(
        p_user_id   => v_user_id,
        p_gems      => 0,
        p_diamonds  => v_total_diamonds
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger on orders uses this function
DROP TRIGGER IF EXISTS trigger_credit_diamonds_on_delivery ON public.orders;
CREATE TRIGGER trigger_credit_diamonds_on_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_diamonds_on_delivery();


-- 3) Rewrite award_referral_diamonds so it no longer touches diamond_transactions
CREATE OR REPLACE FUNCTION public.award_referral_diamonds()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Use referred_by from the new profile row
  v_referrer_id := NEW.referred_by;

  -- If there's a referrer, award diamonds
  IF v_referrer_id IS NOT NULL THEN
    -- Award 100 diamonds to referrer
    PERFORM public.update_treasure_wallet(
      p_user_id   => v_referrer_id,
      p_gems      => 0,
      p_diamonds  => 100
    );

    -- Create notification for referrer
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (
      v_referrer_id,
      'referral',
      'New Referral!',
      'You earned 100 diamonds for referring a new member!',
      NEW.id
    );

    -- Award 50 diamonds to new user
    PERFORM public.update_treasure_wallet(
      p_user_id   => NEW.id,
      p_gems      => 0,
      p_diamonds  => 50
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on profiles
DROP TRIGGER IF EXISTS award_referral_diamonds_trigger ON public.profiles;
CREATE TRIGGER award_referral_diamonds_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.award_referral_diamonds();