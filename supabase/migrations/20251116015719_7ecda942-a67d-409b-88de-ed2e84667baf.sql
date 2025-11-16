-- Update award_referral_diamonds function to use correct column names
CREATE OR REPLACE FUNCTION award_referral_diamonds()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  -- Get the referrer ID from the new user's profile
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE id = NEW.id;
  
  -- If there's a referrer, award diamonds
  IF v_referrer_id IS NOT NULL THEN
    -- Award 100 diamonds to referrer
    INSERT INTO treasure_wallet (id, user_id, diamonds, gems)
    VALUES (v_referrer_id, v_referrer_id, 100, 0)
    ON CONFLICT (id) 
    DO UPDATE SET 
      diamonds = treasure_wallet.diamonds + 100;
    
    -- Log referrer transaction
    INSERT INTO diamond_transactions (user_id, amount, type, description, reference_id)
    VALUES (v_referrer_id, 100, 'credit', 'Referral bonus for new member', NEW.id);
    
    -- Create notification for referrer
    INSERT INTO notifications (user_id, type, title, message, reference_id)
    VALUES (
      v_referrer_id,
      'referral',
      'New Referral!',
      'You earned 100 diamonds for referring a new member!',
      NEW.id
    );
    
    -- Award 50 diamonds to new user
    INSERT INTO treasure_wallet (id, user_id, diamonds, gems)
    VALUES (NEW.id, NEW.id, 50, 0)
    ON CONFLICT (id) 
    DO UPDATE SET 
      diamonds = treasure_wallet.diamonds + 50;
    
    -- Log new user transaction
    INSERT INTO diamond_transactions (user_id, amount, type, description, reference_id)
    VALUES (NEW.id, 50, 'credit', 'Welcome bonus for joining via referral', v_referrer_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS award_referral_diamonds_trigger ON profiles;
CREATE TRIGGER award_referral_diamonds_trigger
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION award_referral_diamonds();