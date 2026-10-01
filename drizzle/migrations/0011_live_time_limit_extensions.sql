ALTER TABLE public.live_plans ADD COLUMN IF NOT EXISTS max_hours integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS extension_price_per_hour numeric NOT NULL DEFAULT 50;
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS ends_at timestamptz, ADD COLUMN IF NOT EXISTS extra_hours integer NOT NULL DEFAULT 0;
UPDATE public.live_streams SET ends_at = coalesce(started_at, created_at) + interval '4 hours' WHERE status='live' AND ends_at IS NULL;

CREATE TABLE public.live_stream_extensions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  hours integer NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'wallet',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_stream_extensions TO authenticated;
GRANT ALL ON public.live_stream_extensions TO service_role;
ALTER TABLE public.live_stream_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin view extensions" ON public.live_stream_extensions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.trg_live_set_ends_at() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE h int;
BEGIN
  IF NEW.ends_at IS NULL THEN
    SELECT max_hours INTO h FROM live_plans WHERE code = NEW.plan_code;
    NEW.ends_at := coalesce(NEW.started_at, now()) + make_interval(hours => coalesce(h,4));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER live_set_ends_at BEFORE INSERT ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.trg_live_set_ends_at();

-- Prevent owners from tampering with ends_at / extra_hours directly
CREATE OR REPLACE FUNCTION public.trg_live_guard_ends_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.ends_at IS DISTINCT FROM OLD.ends_at OR NEW.extra_hours IS DISTINCT FROM OLD.extra_hours)
     AND current_setting('app.live_ext', true) IS DISTINCT FROM '1'
     AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.ends_at := OLD.ends_at; NEW.extra_hours := OLD.extra_hours;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER live_guard_ends_at BEFORE UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.trg_live_guard_ends_at();

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
  IF total > 0 THEN
    SELECT * INTO w FROM cash_wallets WHERE user_id=_uid FOR UPDATE;
    IF NOT FOUND OR w.balance < total THEN RAISE EXCEPTION 'Not enough Cash Wallet balance (₱% needed)', total; END IF;
    UPDATE cash_wallets SET balance = balance - total, updated_at = now() WHERE user_id=_uid;
    INSERT INTO cash_transactions(user_id, amount, transaction_type, description)
      VALUES (_uid, -total, 'purchase', 'Live extension +' || _hours || 'h');
  END IF;
  INSERT INTO live_stream_extensions(stream_id,user_id,hours,amount) VALUES (_stream_id,_uid,_hours,total) RETURNING id INTO _ext;
  PERFORM set_config('app.live_ext','1',true);
  UPDATE live_streams SET ends_at = greatest(coalesce(ends_at, now()), now()) + make_interval(hours => _hours),
    extra_hours = extra_hours + _hours WHERE id=_stream_id RETURNING ends_at INTO _new;
  IF total > 0 THEN PERFORM record_feature_sale(_uid, 'live_extension', total, _ext, 'wallet'); END IF;
  RETURN _new;
END $$;
GRANT EXECUTE ON FUNCTION public.live_extend_wallet(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.live_end_expired() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (UPDATE live_streams SET status='ended', ended_at=now(), stream_key=NULL
    WHERE status='live' AND ends_at IS NOT NULL AND ends_at < now() - interval '2 minutes' RETURNING 1)
  SELECT count(*)::int FROM u;
$$;
GRANT EXECUTE ON FUNCTION public.live_end_expired() TO anon, authenticated;