-- Add marketplace_activated field to profiles for admin override
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS marketplace_activated boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.marketplace_activated IS 'Admin override to allow marketplace features (posting ads, restaurants, products) regardless of diamond/purchase requirements';

-- Update check_marketplace_eligibility function to include admin override
CREATE OR REPLACE FUNCTION public.check_marketplace_eligibility(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referral_count INTEGER;
  has_purchase BOOLEAN;
  user_diamonds INTEGER;
  is_admin_activated BOOLEAN;
  diamond_threshold INTEGER;
BEGIN
  -- Check for admin override first
  SELECT marketplace_activated INTO is_admin_activated
  FROM public.profiles
  WHERE id = user_uuid;
  
  IF is_admin_activated = true THEN
    RETURN true;
  END IF;

  -- Count referrals (profiles.referred_by stores who referred the user)
  SELECT COUNT(*) INTO referral_count
  FROM public.profiles
  WHERE referred_by = user_uuid;

  -- Check for diamond purchase or AI credit purchase
  SELECT EXISTS(
    SELECT 1 FROM public.credit_purchases 
    WHERE user_id = user_uuid AND status = 'approved'
    UNION
    SELECT 1 FROM public.binary_ai_purchases
    WHERE user_id = user_uuid AND status = 'approved'
  ) INTO has_purchase;

  -- Get user's diamond count
  SELECT COALESCE(diamonds, 0) INTO user_diamonds
  FROM public.profiles
  WHERE id = user_uuid;

  -- Get diamond threshold from settings (default 150)
  SELECT COALESCE(
    (SELECT setting_value::integer FROM public.marketplace_settings WHERE setting_key = 'free_listing_diamond_threshold'),
    150
  ) INTO diamond_threshold;

  -- User is eligible if: has 2+ referrals AND (has approved purchase OR has 150+ diamonds)
  RETURN referral_count >= 2 AND (has_purchase OR user_diamonds >= diamond_threshold);
END;
$function$;