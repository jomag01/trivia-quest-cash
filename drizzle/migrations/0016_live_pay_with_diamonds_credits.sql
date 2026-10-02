ALTER TABLE public.live_plans
  ADD COLUMN IF NOT EXISTS price_diamonds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_diamonds_per_hour integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_credits_per_hour integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public._spend_points(_uid uuid, _currency text, _amount integer, _why text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'This payment option is not available'; END IF;
  IF _currency = 'diamonds' THEN
    SELECT diamonds INTO bal FROM treasure_wallet WHERE user_id=_uid FOR UPDATE;
    IF coalesce(bal,0) < _amount THEN RAISE EXCEPTION 'Not enough diamonds (% needed)', _amount; END IF;
    UPDATE treasure_wallet SET diamonds = diamonds - _amount, updated_at=now() WHERE user_id=_uid;
  ELSIF _currency = 'credits' THEN
    SELECT credits INTO bal FROM profiles WHERE id=_uid FOR UPDATE;
    IF coalesce(bal,0) < _amount THEN RAISE EXCEPTION 'Not enough credits (% needed)', _amount; END IF;
    UPDATE profiles SET credits = credits - _amount, updated_at=now() WHERE id=_uid;
  ELSE
    RAISE EXCEPTION 'Unknown payment type';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public._spend_points(uuid,text,integer,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.live_buy_pass_points(_plan_code text, _currency text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; _uid uuid := auth.uid(); _id uuid; cost integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO p FROM live_plans WHERE code=_plan_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not available'; END IF;
  cost := CASE _currency WHEN 'diamonds' THEN p.price_diamonds WHEN 'credits' THEN p.price_credits ELSE 0 END;
  PERFORM _spend_points(_uid, _currency, cost, p.name||' live pass');
  INSERT INTO live_session_passes(user_id, plan_code, amount, status, payment_method, paid_at)
  VALUES (_uid, p.code, p.price_per_session, 'paid', _currency, now()) RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.live_buy_pass_points(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.live_extend_points(_stream_id uuid, _hours integer, _currency text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); s record; p record; cost integer; _ext uuid; _new timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _hours < 1 OR _hours > 8 THEN RAISE EXCEPTION 'Choose 1 to 8 hours'; END IF;
  SELECT * INTO s FROM live_streams WHERE id=_stream_id FOR UPDATE;
  IF NOT FOUND OR s.user_id <> _uid THEN RAISE EXCEPTION 'Not your live'; END IF;
  IF s.status <> 'live' THEN RAISE EXCEPTION 'This live has already ended'; END IF;
  SELECT * INTO p FROM live_plans WHERE code=s.plan_code;
  cost := _hours * CASE _currency WHEN 'diamonds' THEN p.extension_diamonds_per_hour WHEN 'credits' THEN p.extension_credits_per_hour ELSE 0 END;
  PERFORM _spend_points(_uid, _currency, cost, 'Live extension');
  INSERT INTO live_stream_extensions(stream_id,user_id,hours,amount,payment_method)
    VALUES (_stream_id,_uid,_hours,coalesce(p.extension_price_per_hour,0)*_hours,_currency) RETURNING id INTO _ext;
  PERFORM set_config('app.live_ext','1',true);
  UPDATE live_streams SET ends_at = greatest(coalesce(ends_at, now()), now()) + make_interval(hours => _hours),
    extra_hours = extra_hours + _hours WHERE id=_stream_id RETURNING ends_at INTO _new;
  IF coalesce(p.extension_price_per_hour,0) > 0 THEN
    PERFORM record_feature_sale(_uid, 'live_extension', p.extension_price_per_hour*_hours, _ext, _currency);
  END IF;
  RETURN _new;
END $$;
GRANT EXECUTE ON FUNCTION public.live_extend_points(uuid,integer,text) TO authenticated;

-- Referral earnings (user_wallets.balance) -> diamonds at the admin diamond price
CREATE OR REPLACE FUNCTION public.convert_earnings_to_diamonds(_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); bal numeric; price numeric; d integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter an amount'; END IF;
  SELECT coalesce((SELECT setting_value::numeric FROM treasure_admin_settings WHERE setting_key='earnings_to_diamond_price'),
                  (SELECT setting_value::numeric FROM treasure_admin_settings WHERE setting_key='diamond_base_price'), 10) INTO price;
  IF price <= 0 THEN RAISE EXCEPTION 'Conversion not available'; END IF;
  d := floor(_amount / price);
  IF d < 1 THEN RAISE EXCEPTION 'Amount too small — 1 diamond costs ₱%', price; END IF;
  SELECT balance INTO bal FROM user_wallets WHERE user_id=_uid FOR UPDATE;
  IF coalesce(bal,0) < d*price THEN RAISE EXCEPTION 'Not enough referral earnings'; END IF;
  UPDATE user_wallets SET balance = balance - d*price WHERE user_id=_uid;
  INSERT INTO treasure_wallet(user_id, diamonds) VALUES (_uid, d)
    ON CONFLICT (user_id) DO UPDATE SET diamonds = treasure_wallet.diamonds + d, updated_at=now();
  RETURN jsonb_build_object('diamonds', d, 'spent', d*price, 'price', price);
END $$;
GRANT EXECUTE ON FUNCTION public.convert_earnings_to_diamonds(numeric) TO authenticated;