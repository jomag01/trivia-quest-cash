-- Fix search_path for verify_user_on_first_order function
CREATE OR REPLACE FUNCTION verify_user_on_first_order()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user if this is their first completed order with non-COD payment
  IF NEW.status = 'delivered' AND NEW.payment_method IN ('gcash', 'bank_transfer', 'credits', 'diamonds') THEN
    UPDATE profiles 
    SET is_verified = TRUE 
    WHERE id = NEW.user_id AND is_verified = FALSE;
  END IF;
  RETURN NEW;
END;
$$;