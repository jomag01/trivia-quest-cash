-- Update the trigger to handle referral relationships
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer_id uuid;
  referral_code_input text;
BEGIN
  -- Get the referral code from user metadata
  referral_code_input := new.raw_user_meta_data->>'referral_code';
  
  -- If a referral code was provided, find the referrer
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(TRIM(referral_code_input));
  END IF;
  
  -- Insert the new profile with the referrer relationship
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
    referrer_id  -- This will be NULL if no valid referral code was provided
  );
  
  RETURN new;
END;
$function$;