CREATE OR REPLACE FUNCTION public.live_extend_wallet(_stream_id uuid, _hours integer)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); s record; price numeric; total numeric; w record; _ext uuid; _new timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _hours < 1 OR _hours > 8 THEN RAISE EXCEPTION 'Choose 1 to 8 hours'; END IF;
  SELECT * INTO s FROM live_streams WHERE id=_stream_id FOR UPDATE;
  IF NOT FOUND OR s.user_id <> _uid THEN RAISE EXCEPTION 'Not your live'; END IF;
  IF s.status <> 'live' THEN RAISE EXCEPTION 'This live has already ended'; END IF;
  SELECT extension_price_per_hour INTO price FROM live_plans WHERE code=s.plan_code;
  total := coalesce(price,0) * _hours;
  INSERT INTO live_stream_extensions(stream_id,user_id,hours,amount) VALUES (_stream_id,_uid,_hours,total) RETURNING id INTO _ext;
  IF total > 0 THEN
    SELECT * INTO w FROM cash_wallets WHERE user_id=_uid FOR UPDATE;
    IF NOT FOUND OR w.balance < total THEN RAISE EXCEPTION 'Not enough Cash Wallet balance (₱% needed)', total; END IF;
    UPDATE cash_wallets SET balance = balance - total, updated_at = now() WHERE id=w.id;
    INSERT INTO cash_transactions(user_id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
      VALUES (_uid, 'purchase', -total, w.balance, w.balance-total, 'Live extension +' || _hours || 'h', 'live_extension', _ext::text);
  END IF;
  PERFORM set_config('app.live_ext','1',true);
  UPDATE live_streams SET ends_at = greatest(coalesce(ends_at, now()), now()) + make_interval(hours => _hours),
    extra_hours = extra_hours + _hours WHERE id=_stream_id RETURNING ends_at INTO _new;
  IF total > 0 THEN PERFORM record_feature_sale(_uid, 'live_extension', total, _ext, 'cash_wallet'); END IF;
  RETURN _new;
END $$;