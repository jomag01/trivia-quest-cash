CREATE TABLE public.live_plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_per_session numeric(12,2) NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_plans TO authenticated;
GRANT ALL ON public.live_plans TO service_role;
ALTER TABLE public.live_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view live plans" ON public.live_plans FOR SELECT USING (true);
CREATE POLICY "Admins manage live plans" ON public.live_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.live_plans (code, name, description, price_per_session, features, sort_order) VALUES
 ('basic', 'Basic Live', 'Go live with camera, chat, basket and checkout.', 49,
  '{"chroma_key":false,"auto_bg_removal":false,"custom_background":false,"stickers":false}'::jsonb, 1),
 ('pro', 'Pro Live', 'Everything in Basic plus virtual backgrounds, green screen, auto background removal and stickers.', 149,
  '{"chroma_key":true,"auto_bg_removal":true,"custom_background":true,"stickers":true}'::jsonb, 2);

CREATE TABLE public.live_session_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_code text NOT NULL REFERENCES public.live_plans(code),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','used')),
  payment_method text,
  stream_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  used_at timestamptz
);
CREATE INDEX idx_live_passes_user ON public.live_session_passes(user_id, status);
GRANT SELECT ON public.live_session_passes TO authenticated;
GRANT ALL ON public.live_session_passes TO service_role;
ALTER TABLE public.live_session_passes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own live passes" ON public.live_session_passes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS plan_code text NOT NULL DEFAULT 'basic';

-- Streams must be started through live_start_session so payment is enforced
DROP POLICY IF EXISTS "Users can create their own streams" ON public.live_streams;

CREATE OR REPLACE FUNCTION public.live_buy_pass_wallet(_plan_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; w record; _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO p FROM live_plans WHERE code=_plan_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not available'; END IF;
  SELECT * INTO w FROM cash_wallets WHERE user_id=_uid FOR UPDATE;
  IF NOT FOUND OR w.balance < p.price_per_session THEN RAISE EXCEPTION 'Insufficient Cash Wallet balance'; END IF;
  UPDATE cash_wallets SET balance=balance-p.price_per_session, updated_at=now() WHERE id=w.id;
  INSERT INTO live_session_passes(user_id, plan_code, amount, status, payment_method, paid_at)
  VALUES (_uid, p.code, p.price_per_session, 'paid', 'cash_wallet', now()) RETURNING id INTO _id;
  INSERT INTO cash_transactions(user_id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
  VALUES (_uid, 'purchase', -p.price_per_session, w.balance, w.balance-p.price_per_session, p.name||' session pass', 'live_pass', _id::text);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.live_create_pending_pass(_plan_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO p FROM live_plans WHERE code=_plan_code AND is_active;
  IF NOT FOUND OR p.price_per_session <= 0 THEN RAISE EXCEPTION 'Plan not available'; END IF;
  INSERT INTO live_session_passes(user_id, plan_code, amount, status, payment_method)
  VALUES (_uid, p.code, p.price_per_session, 'pending', 'paymongo') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.live_mark_pass_paid(_pass_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE live_session_passes SET status='paid', paid_at=now() WHERE id=_pass_id AND status='pending';
$$;

CREATE OR REPLACE FUNCTION public.live_my_entitlements()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'approved', public.can_go_live(auth.uid()),
    'basic_passes', (SELECT count(*) FROM live_session_passes WHERE user_id=auth.uid() AND status='paid' AND plan_code='basic'),
    'pro_passes', (SELECT count(*) FROM live_session_passes WHERE user_id=auth.uid() AND status='paid' AND plan_code='pro'));
$$;

CREATE OR REPLACE FUNCTION public.live_start_session(_plan_code text, _title text, _description text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _pass uuid; _sid uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _plan_code NOT IN ('basic','pro') THEN RAISE EXCEPTION 'Unknown plan'; END IF;
  IF length(trim(coalesce(_title,''))) = 0 THEN RAISE EXCEPTION 'Title required'; END IF;
  IF NOT (_plan_code='basic' AND public.can_go_live(_uid)) THEN
    SELECT id INTO _pass FROM live_session_passes
      WHERE user_id=_uid AND status='paid' AND plan_code=_plan_code
      ORDER BY paid_at LIMIT 1 FOR UPDATE SKIP LOCKED;
    IF _pass IS NULL THEN RAISE EXCEPTION 'Please buy a % live pass first', _plan_code; END IF;
  END IF;
  INSERT INTO live_streams(user_id, title, description, status, started_at, plan_code)
  VALUES (_uid, left(trim(_title),100), left(coalesce(_description,''),1000), 'live', now(), _plan_code)
  RETURNING id INTO _sid;
  IF _pass IS NOT NULL THEN
    UPDATE live_session_passes SET status='used', used_at=now(), stream_id=_sid WHERE id=_pass;
  END IF;
  RETURN _sid;
END $$;

REVOKE ALL ON FUNCTION public.live_mark_pass_paid(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_mark_pass_paid(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.live_buy_pass_wallet(text), public.live_create_pending_pass(text), public.live_my_entitlements(), public.live_start_session(text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.live_buy_pass_wallet(text), public.live_create_pending_pass(text), public.live_my_entitlements(), public.live_start_session(text,text,text) TO authenticated;