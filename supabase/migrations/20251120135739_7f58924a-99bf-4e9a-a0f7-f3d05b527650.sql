-- Fix security warning: Add search_path to function
CREATE OR REPLACE FUNCTION award_product_referral_commission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Only process when order status changes to delivered
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') AND NEW.product_referrer_id IS NOT NULL THEN
    
    -- Get the referral record
    SELECT pr.*, p.referral_commission_diamonds
    INTO v_referral
    FROM product_referrals pr
    JOIN products p ON p.id = pr.product_id
    WHERE pr.order_id = NEW.id
    AND pr.commission_paid = false
    LIMIT 1;
    
    IF FOUND AND v_referral.referral_commission_diamonds > 0 THEN
      -- Award diamonds to referrer
      INSERT INTO treasure_wallet (user_id, diamonds, gems)
      VALUES (v_referral.referrer_id, v_referral.referral_commission_diamonds, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        diamonds = treasure_wallet.diamonds + v_referral.referral_commission_diamonds,
        updated_at = now();
      
      -- Mark commission as paid
      UPDATE product_referrals
      SET commission_paid = true
      WHERE id = v_referral.id;
      
      -- Create notification
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        v_referral.referrer_id,
        'Referral Commission Earned!',
        format('You earned %s diamonds from a product referral!', v_referral.referral_commission_diamonds),
        'commission'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;