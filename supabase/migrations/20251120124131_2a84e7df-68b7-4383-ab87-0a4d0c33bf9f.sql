-- Fix referral handling to support all metadata field variations

-- Update handle_new_user to support referral_code, referrer_id, AND referred_by metadata
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
  -- Try to find referrer using referral_code (preferred method)
  referral_code_input := new.raw_user_meta_data->>'referral_code';
  
  IF referral_code_input IS NOT NULL AND referral_code_input <> '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(referral_code_input));
  ELSE
    -- Try referrer_id field (UUID string)
    raw_referrer_id := new.raw_user_meta_data->>'referrer_id';
    IF raw_referrer_id IS NOT NULL AND raw_referrer_id <> '' THEN
      SELECT id INTO referrer_id
      FROM public.profiles
      WHERE id = raw_referrer_id::uuid;
    ELSE
      -- Try referred_by field (UUID string) - this is the missing check
      raw_referrer_id := new.raw_user_meta_data->>'referred_by';
      IF raw_referrer_id IS NOT NULL AND raw_referrer_id <> '' THEN
        SELECT id INTO referrer_id
        FROM public.profiles
        WHERE id = raw_referrer_id::uuid;
      END IF;
    END IF;
  END IF;
  
  -- Insert the new profile with the resolved referrer
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
    referrer_id
  );
  
  RETURN new;
END;
$function$;

-- Backfill referred_by for users who have referred_by in their metadata
UPDATE public.profiles p
SET referred_by = (u.raw_user_meta_data->>'referred_by')::uuid
FROM auth.users u
WHERE p.id = u.id
  AND p.referred_by IS NULL
  AND u.raw_user_meta_data->>'referred_by' IS NOT NULL
  AND u.raw_user_meta_data->>'referred_by' <> ''
  AND (u.raw_user_meta_data->>'referred_by')::uuid IN (SELECT id FROM public.profiles);

-- Sync any missing entries to referrals table
INSERT INTO public.referrals (referrer_id, referred_id, created_at)
SELECT p.referred_by, p.id, COALESCE(p.created_at, now())
FROM public.profiles p
LEFT JOIN public.referrals r
  ON r.referrer_id = p.referred_by AND r.referred_id = p.id
WHERE p.referred_by IS NOT NULL
  AND r.id IS NULL
ON CONFLICT DO NOTHING;