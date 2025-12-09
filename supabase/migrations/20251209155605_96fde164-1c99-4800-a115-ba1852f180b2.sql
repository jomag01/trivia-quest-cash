-- Add admin override columns to services table for pricing and commissions
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS vendor_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_price_override NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_diamond_override INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_referral_diamond_override INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

-- Add function to get user's affiliate eligibility (2+ referrals and 150+ diamonds)
CREATE OR REPLACE FUNCTION public.check_affiliate_eligibility(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_count INTEGER;
  diamond_balance INTEGER;
  is_eligible BOOLEAN;
BEGIN
  -- Count referrals
  SELECT COUNT(*) INTO referral_count
  FROM profiles
  WHERE referred_by = user_id_param;
  
  -- Get diamond balance from treasure_wallet
  SELECT COALESCE(diamonds, 0) INTO diamond_balance
  FROM treasure_wallet
  WHERE user_id = user_id_param;
  
  -- Check eligibility: 2+ referrals AND 150+ diamonds
  is_eligible := (referral_count >= 2) AND (COALESCE(diamond_balance, 0) >= 150);
  
  RETURN jsonb_build_object(
    'is_eligible', is_eligible,
    'referral_count', referral_count,
    'diamond_balance', COALESCE(diamond_balance, 0),
    'required_referrals', 2,
    'required_diamonds', 150
  );
END;
$$;