-- Fix marketplace eligibility function to match actual profiles schema
-- Previously referenced profiles.referrer_id (non-existent) causing inserts to fail via RLS policy.

CREATE OR REPLACE FUNCTION public.check_marketplace_eligibility(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referral_count INTEGER;
  has_purchase BOOLEAN;
BEGIN
  -- Count referrals (profiles.referred_by stores who referred the user)
  SELECT COUNT(*) INTO referral_count
  FROM public.profiles
  WHERE referred_by = user_uuid;

  -- Check for diamond purchase or AI credit purchase
  SELECT EXISTS(
    SELECT 1 FROM public.credit_purchases 
    WHERE user_id = user_uuid AND status = 'approved'
    UNION
    SELECT 1 FROM public.ai_credit_purchases
    WHERE user_id = user_uuid AND status = 'approved'
    UNION
    SELECT 1 FROM public.binary_ai_purchases
    WHERE user_id = user_uuid AND status = 'approved'
  ) INTO has_purchase;

  -- Must have 2+ referrals AND at least one purchase
  RETURN referral_count >= 2 AND has_purchase;
END;
$function$;
