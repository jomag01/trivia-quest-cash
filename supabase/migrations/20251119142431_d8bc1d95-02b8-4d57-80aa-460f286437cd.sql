-- Fix referral handling and diamond crediting on delivered orders

-- 1) Update handle_new_user to support both referral_code and legacy referrer_id metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  referrer_id uuid;
  referral_code_input text;
  raw_referrer_id text;
BEGIN
  -- Prefer referral code from metadata (current behavior)
  referral_code_input := new.raw_user_meta_data->>'referral_code';
  
  IF referral_code_input IS NOT NULL AND referral_code_input <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(referral_code_input));
  ELSE
    -- Fallback for older clients that sent a direct referrer_id
    raw_referrer_id := new.raw_user_meta_data->>'referrer_id';
    IF raw_referrer_id IS NOT NULL AND raw_referrer_id <> '' THEN
      SELECT id INTO referrer_id
      FROM public.profiles
      WHERE id = raw_referrer_id::uuid;
    END IF;
  END IF;
  
  -- Insert the new profile with the resolved referrer (if any)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    country,
    currency,
    currency_symbol,
    referral_code,
    referred_by
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'country',
    COALESCE(new.raw_user_meta_data->>'currency', 'PHP'),
    COALESCE(new.raw_user_meta_data->>'currency_symbol', '₱'),
    generate_referral_code(),
    referrer_id  -- NULL if no valid referral was provided
  );
  
  RETURN new;
END;
$function$;

-- 2) Backfill referred_by for existing profiles using legacy referrer_id metadata
UPDATE public.profiles p
SET referred_by = (u.raw_user_meta_data->>'referrer_id')::uuid
FROM auth.users u
WHERE p.id = u.id
  AND p.referred_by IS NULL
  AND u.raw_user_meta_data->>'referrer_id' IS NOT NULL
  AND u.raw_user_meta_data->>'referrer_id' <> '';

-- 3) Ensure referrals table reflects profile relationships and stays in sync
CREATE OR REPLACE FUNCTION public.handle_profile_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, created_at)
    VALUES (NEW.referred_by, NEW.id, COALESCE(NEW.created_at, now()));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_insert_referral ON public.profiles;
CREATE TRIGGER on_profile_insert_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_referral();

-- Backfill referrals table from existing profiles
INSERT INTO public.referrals (referrer_id, referred_id, created_at)
SELECT p.referred_by, p.id, COALESCE(p.created_at, now())
FROM public.profiles p
LEFT JOIN public.referrals r
  ON r.referrer_id = p.referred_by AND r.referred_id = p.id
WHERE p.referred_by IS NOT NULL
  AND r.id IS NULL;

-- 4) Credit diamonds automatically when an order is delivered
CREATE OR REPLACE FUNCTION public.handle_order_delivered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered'
     AND (OLD.status IS DISTINCT FROM 'delivered')
     AND NEW.total_diamond_credits IS NOT NULL
     AND NEW.total_diamond_credits > 0 THEN
    
    -- Add diamonds to the buyer's treasure wallet
    PERFORM public.update_treasure_wallet(
      p_user_id => NEW.user_id,
      p_gems    => 0,
      p_diamonds => NEW.total_diamond_credits::integer
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_delivered();
