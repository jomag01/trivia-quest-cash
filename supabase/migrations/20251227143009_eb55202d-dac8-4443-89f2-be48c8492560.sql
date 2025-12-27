-- Fix: treat admin-activated / paid affiliate users as eligible even without 2 referrals + 150 diamonds

CREATE OR REPLACE FUNCTION public.can_create_ads(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  diamond_count INT;
  referral_count INT;
  current_step INT;
  is_paid BOOLEAN;
  is_admin_activated BOOLEAN;
BEGIN
  -- Admin override: paid affiliate OR admin activated rank
  SELECT COALESCE(is_paid_affiliate, false) INTO is_paid
  FROM public.profiles
  WHERE id = user_id_param;

  IF is_paid THEN
    RETURN true;
  END IF;

  SELECT COALESCE(admin_activated, false) INTO is_admin_activated
  FROM public.affiliate_current_rank
  WHERE user_id = user_id_param;

  IF is_admin_activated THEN
    RETURN true;
  END IF;

  -- Default requirements
  SELECT COALESCE(diamonds, 0) INTO diamond_count
  FROM public.treasure_wallet
  WHERE user_id = user_id_param;

  IF diamond_count < 150 THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO referral_count
  FROM public.referrals
  WHERE referrer_id = user_id_param;

  IF referral_count < 2 THEN
    RETURN false;
  END IF;

  SELECT COALESCE(current_step, 0) INTO current_step
  FROM public.affiliate_current_rank
  WHERE user_id = user_id_param;

  IF current_step < 2 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_affiliate_eligibility(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  referral_count INTEGER;
  diamond_balance INTEGER;
  is_paid BOOLEAN;
  is_eligible BOOLEAN;
BEGIN
  SELECT COALESCE(is_paid_affiliate, false) INTO is_paid
  FROM public.profiles
  WHERE id = user_id_param;

  SELECT COUNT(*) INTO referral_count
  FROM public.profiles
  WHERE referred_by = user_id_param;

  SELECT COALESCE(diamonds, 0) INTO diamond_balance
  FROM public.treasure_wallet
  WHERE user_id = user_id_param;

  is_eligible := is_paid OR ((referral_count >= 2) AND (COALESCE(diamond_balance, 0) >= 150));

  RETURN jsonb_build_object(
    'is_eligible', is_eligible,
    'is_paid_affiliate', is_paid,
    'referral_count', referral_count,
    'diamond_balance', COALESCE(diamond_balance, 0),
    'required_referrals', 2,
    'required_diamonds', 150
  );
END;
$$;