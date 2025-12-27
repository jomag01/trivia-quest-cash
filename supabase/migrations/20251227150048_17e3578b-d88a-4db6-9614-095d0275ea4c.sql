-- Fix seller + affiliate eligibility to respect admin activation

CREATE OR REPLACE FUNCTION public.can_become_seller(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_paid boolean;
  is_admin_activated boolean;
  referral_count int;
BEGIN
  -- Admin override: paid affiliate OR admin activated rank
  SELECT COALESCE(is_paid_affiliate, false)
    INTO is_paid
  FROM public.profiles
  WHERE id = p_user_id;

  IF is_paid THEN
    RETURN true;
  END IF;

  SELECT COALESCE(admin_activated, false)
    INTO is_admin_activated
  FROM public.affiliate_current_rank
  WHERE user_id = p_user_id;

  IF is_admin_activated THEN
    RETURN true;
  END IF;

  -- Default requirement: at least 2 referrals
  SELECT COUNT(*)
    INTO referral_count
  FROM public.referrals
  WHERE referrer_id = p_user_id;

  RETURN referral_count >= 2;
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
  is_admin_activated BOOLEAN;
  is_eligible BOOLEAN;
BEGIN
  SELECT COALESCE(is_paid_affiliate, false)
    INTO is_paid
  FROM public.profiles
  WHERE id = user_id_param;

  SELECT COALESCE(admin_activated, false)
    INTO is_admin_activated
  FROM public.affiliate_current_rank
  WHERE user_id = user_id_param;

  SELECT COUNT(*)
    INTO referral_count
  FROM public.profiles
  WHERE referred_by = user_id_param;

  SELECT COALESCE(diamonds, 0)
    INTO diamond_balance
  FROM public.treasure_wallet
  WHERE user_id = user_id_param;

  is_eligible := is_paid
    OR is_admin_activated
    OR ((referral_count >= 2) AND (COALESCE(diamond_balance, 0) >= 150));

  RETURN jsonb_build_object(
    'is_eligible', is_eligible,
    'is_paid_affiliate', is_paid,
    'admin_activated', is_admin_activated,
    'referral_count', referral_count,
    'diamond_balance', COALESCE(diamond_balance, 0),
    'required_referrals', 2,
    'required_diamonds', 150
  );
END;
$$;