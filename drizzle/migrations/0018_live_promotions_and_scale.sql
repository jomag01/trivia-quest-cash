CREATE TABLE public.live_promotion_packages (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  placement text NOT NULL DEFAULT 'live_top' CHECK (placement IN ('live_top','shop_front')),
  hours integer NOT NULL DEFAULT 1,
  priority integer NOT NULL DEFAULT 10,
  price_cash numeric NOT NULL DEFAULT 0,
  price_diamonds integer NOT NULL DEFAULT 0,
  price_credits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_promotion_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_promotion_packages TO authenticated;
GRANT ALL ON public.live_promotion_packages TO service_role;
ALTER TABLE public.live_promotion_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views promo packages" ON public.live_promotion_packages FOR SELECT USING (true);
CREATE POLICY "Admins manage promo packages" ON public.live_promotion_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.live_stream_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  package_code text NOT NULL REFERENCES public.live_promotion_packages(code),
  placement text NOT NULL,
  priority integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_live_promotions_user ON public.live_stream_promotions(user_id, created_at DESC);
GRANT SELECT ON public.live_stream_promotions TO authenticated;
GRANT ALL ON public.live_stream_promotions TO service_role;
ALTER TABLE public.live_stream_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own promotions" ON public.live_stream_promotions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.live_streams
  ADD COLUMN IF NOT EXISTS promoted_until timestamptz,
  ADD COLUMN IF NOT EXISTS promo_priority integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_shop_front boolean NOT NULL DEFAULT false;

-- Indexes for very large numbers of concurrent lives
CREATE INDEX IF NOT EXISTS idx_live_streams_live_rank ON public.live_streams (promo_priority DESC, viewer_count DESC, created_at DESC) WHERE status = 'live';
CREATE INDEX IF NOT EXISTS idx_live_streams_live_shopfront ON public.live_streams (promo_priority DESC, viewer_count DESC) WHERE status = 'live' AND promo_shop_front;
CREATE INDEX IF NOT EXISTS idx_live_streams_ended_at ON public.live_streams (ended_at DESC) WHERE status = 'ended';
CREATE INDEX IF NOT EXISTS idx_live_streams_live_ends ON public.live_streams (ends_at) WHERE status = 'live';

-- Owners cannot set promotion fields themselves
CREATE OR REPLACE FUNCTION public.trg_live_guard_promo() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_setting('app.live_promo', true) IS DISTINCT FROM '1'
     AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.promoted_until := NULL; NEW.promo_priority := 0; NEW.promo_shop_front := false;
    ELSE
      NEW.promoted_until := OLD.promoted_until; NEW.promo_priority := OLD.promo_priority; NEW.promo_shop_front := OLD.promo_shop_front;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS live_guard_promo ON public.live_streams;
CREATE TRIGGER live_guard_promo BEFORE INSERT OR UPDATE ON public.live_streams FOR EACH ROW EXECUTE FUNCTION public.trg_live_guard_promo();

CREATE OR REPLACE FUNCTION public.live_promote(_stream_id uuid, _package_code text, _method text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); s record; p record; w record; _pid uuid; _until timestamptz; amt numeric := 0; _shop boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO s FROM live_streams WHERE id=_stream_id FOR UPDATE;
  IF NOT FOUND OR s.user_id <> _uid THEN RAISE EXCEPTION 'Not your live'; END IF;
  IF s.status <> 'live' THEN RAISE EXCEPTION 'This live has already ended'; END IF;
  SELECT * INTO p FROM live_promotion_packages WHERE code=_package_code AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'This promotion is not available'; END IF;

  _until := greatest(coalesce(s.promoted_until, now()), now()) + make_interval(hours => greatest(p.hours,1));
  INSERT INTO live_stream_promotions(stream_id,user_id,package_code,placement,priority,amount,payment_method,ends_at)
    VALUES (_stream_id,_uid,p.code,p.placement,p.priority,0,_method,_until) RETURNING id INTO _pid;

  IF _method = 'cash_wallet' THEN
    amt := p.price_cash;
    IF amt <= 0 THEN RAISE EXCEPTION 'This payment option is not available'; END IF;
    SELECT * INTO w FROM cash_wallets WHERE user_id=_uid FOR UPDATE;
    IF NOT FOUND OR w.balance < amt THEN RAISE EXCEPTION 'Not enough Cash Wallet balance (₱% needed)', amt; END IF;
    UPDATE cash_wallets SET balance = balance - amt, updated_at = now() WHERE id=w.id;
    INSERT INTO cash_transactions(user_id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
      VALUES (_uid,'purchase',-amt,w.balance,w.balance-amt,'Live promotion: '||p.name,'live_promotion',_pid::text);
  ELSIF _method = 'diamonds' THEN
    PERFORM _spend_points(_uid,'diamonds',p.price_diamonds,'live_promotion'); amt := p.price_cash;
  ELSIF _method = 'credits' THEN
    PERFORM _spend_points(_uid,'credits',p.price_credits,'live_promotion'); amt := p.price_cash;
  ELSE RAISE EXCEPTION 'Unknown payment type'; END IF;

  UPDATE live_stream_promotions SET amount=amt WHERE id=_pid;
  _shop := s.promo_shop_front OR p.placement='shop_front';
  PERFORM set_config('app.live_promo','1',true);
  UPDATE live_streams SET promoted_until=_until, promo_priority=greatest(promo_priority, p.priority), promo_shop_front=_shop WHERE id=_stream_id;
  IF amt > 0 THEN PERFORM record_feature_sale(_uid,'live_promotion',amt,_pid,_method); END IF;
  RETURN _until;
END $$;
REVOKE ALL ON FUNCTION public.live_promote(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.live_promote(uuid,text,text) TO authenticated;

-- Clears expired promotions (called alongside live_end_expired)
CREATE OR REPLACE FUNCTION public.live_clear_expired_promos() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM set_config('app.live_promo','1',true);
  UPDATE live_streams SET promo_priority=0, promo_shop_front=false
   WHERE promo_priority > 0 AND (promoted_until IS NULL OR promoted_until < now() OR status <> 'live');
END $$;
GRANT EXECUTE ON FUNCTION public.live_clear_expired_promos() TO anon, authenticated;

INSERT INTO public.live_promotion_packages(code,name,description,placement,hours,priority,price_cash,price_diamonds,price_credits,sort_order) VALUES
 ('boost_1h','Boost 1 hour','Shown at the top of the Live page for 1 hour.','live_top',1,10,50,500,50,1),
 ('boost_3h','Boost 3 hours','Shown at the top of the Live page for 3 hours.','live_top',3,20,120,1200,120,2),
 ('shop_front_1h','Shop front 1 hour','Featured at the front of the Shop and top of the Live page for 1 hour.','shop_front',1,50,150,1500,150,3)
ON CONFLICT DO NOTHING;

INSERT INTO public.paid_feature_commissions(feature_key,label,category,description,commission_type,referrer_value,upline_value,unilevel_pct,stairstep_pct,leadership_pct,is_active)
VALUES ('live_promotion','Live promotions (boost)','live','When a seller pays to promote their live.','percentage',10,5,3,2,1,true)
ON CONFLICT (feature_key) DO NOTHING;