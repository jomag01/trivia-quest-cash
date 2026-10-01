ALTER TABLE public.live_session_passes DROP CONSTRAINT live_session_passes_status_check;
ALTER TABLE public.live_session_passes ADD CONSTRAINT live_session_passes_status_check CHECK (status IN ('pending','pending_review','paid','used','rejected'));
ALTER TABLE public.live_session_passes ADD COLUMN IF NOT EXISTS proof_url text, ADD COLUMN IF NOT EXISTS reference_number text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz, ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.paid_feature_commissions (
  feature_key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'live',
  commission_type text NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage','fixed')),
  referrer_value numeric NOT NULL DEFAULT 0,
  upline_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.paid_feature_commissions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.paid_feature_commissions TO authenticated;
GRANT ALL ON public.paid_feature_commissions TO service_role;
ALTER TABLE public.paid_feature_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views feature commissions" ON public.paid_feature_commissions FOR SELECT USING (true);
CREATE POLICY "Admins manage feature commissions" ON public.paid_feature_commissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.feature_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  source_id uuid,
  commissions_paid numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (feature_key, source_id)
);
GRANT SELECT ON public.feature_sales TO authenticated;
GRANT ALL ON public.feature_sales TO service_role;
ALTER TABLE public.feature_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own feature sales" ON public.feature_sales FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.feature_commission_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.feature_sales(id) ON DELETE CASCADE,
  earner_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  feature_key text NOT NULL,
  level int NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feature_comm_earner ON public.feature_commission_earnings(earner_id);
GRANT SELECT ON public.feature_commission_earnings TO authenticated;
GRANT ALL ON public.feature_commission_earnings TO service_role;
ALTER TABLE public.feature_commission_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Earners view own feature commissions" ON public.feature_commission_earnings FOR SELECT TO authenticated USING (earner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.record_feature_sale(_user_id uuid, _feature_key text, _amount numeric, _source_id uuid, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; _sale uuid; _ref uuid; _up uuid; _a1 numeric := 0; _a2 numeric := 0; _lbl text;
BEGIN
  INSERT INTO feature_sales(user_id, feature_key, amount, payment_method, source_id)
  VALUES (_user_id, _feature_key, coalesce(_amount,0), _method, _source_id)
  ON CONFLICT (feature_key, source_id) DO NOTHING RETURNING id INTO _sale;
  IF _sale IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO s FROM paid_feature_commissions WHERE feature_key=_feature_key AND is_active;
  IF NOT FOUND OR coalesce(_amount,0) <= 0 THEN RETURN _sale; END IF;
  _lbl := s.label;
  SELECT referred_by INTO _ref FROM profiles WHERE id=_user_id;
  IF _ref IS NOT NULL AND _ref <> _user_id THEN
    _a1 := CASE WHEN s.commission_type='fixed' THEN s.referrer_value ELSE round(_amount*s.referrer_value/100.0,2) END;
    SELECT referred_by INTO _up FROM profiles WHERE id=_ref;
    IF _up IS NOT NULL AND _up NOT IN (_ref,_user_id) THEN
      _a2 := CASE WHEN s.commission_type='fixed' THEN s.upline_value ELSE round(_amount*s.upline_value/100.0,2) END;
    END IF;
  END IF;
  IF _a1 > 0 THEN
    INSERT INTO feature_commission_earnings(sale_id,earner_id,buyer_id,feature_key,level,amount) VALUES (_sale,_ref,_user_id,_feature_key,1,_a1);
    INSERT INTO user_wallets(user_id,balance,total_commissions) VALUES (_ref,_a1,_a1)
      ON CONFLICT (user_id) DO UPDATE SET balance=coalesce(user_wallets.balance,0)+_a1, total_commissions=coalesce(user_wallets.total_commissions,0)+_a1;
    INSERT INTO commission_notifications(user_id,source_type,amount,message)
      VALUES (_ref,'paid_features',_a1,'You earned ₱'||to_char(_a1,'FM999999990.00')||' from a referral buying '||_lbl||'!');
  END IF;
  IF _a2 > 0 THEN
    INSERT INTO feature_commission_earnings(sale_id,earner_id,buyer_id,feature_key,level,amount) VALUES (_sale,_up,_user_id,_feature_key,2,_a2);
    INSERT INTO user_wallets(user_id,balance,total_commissions) VALUES (_up,_a2,_a2)
      ON CONFLICT (user_id) DO UPDATE SET balance=coalesce(user_wallets.balance,0)+_a2, total_commissions=coalesce(user_wallets.total_commissions,0)+_a2;
    INSERT INTO commission_notifications(user_id,source_type,amount,message)
      VALUES (_up,'paid_features',_a2,'You earned ₱'||to_char(_a2,'FM999999990.00')||' from your team buying '||_lbl||'!');
  END IF;
  UPDATE feature_sales SET commissions_paid=_a1+_a2 WHERE id=_sale;
  RETURN _sale;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_feature_sale(uuid,text,numeric,uuid,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_live_pass_paid() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='paid' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'paid') THEN
    PERFORM record_feature_sale(NEW.user_id, 'live_pass_'||NEW.plan_code, NEW.amount, NEW.id, NEW.payment_method);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER live_pass_paid_sale AFTER INSERT OR UPDATE OF status ON public.live_session_passes
  FOR EACH ROW EXECUTE FUNCTION public.trg_live_pass_paid();

CREATE OR REPLACE FUNCTION public.live_submit_manual_pass(_plan_code text, _proof_url text, _reference text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF coalesce(trim(_proof_url),'') = '' THEN RAISE EXCEPTION 'Payment proof is required'; END IF;
  SELECT * INTO p FROM live_plans WHERE code=_plan_code AND is_active;
  IF NOT FOUND OR p.price_per_session <= 0 THEN RAISE EXCEPTION 'Plan not available'; END IF;
  INSERT INTO live_session_passes(user_id, plan_code, amount, status, payment_method, proof_url, reference_number)
  VALUES (_uid, p.code, p.price_per_session, 'pending_review', 'manual_gcash', _proof_url, left(coalesce(_reference,''),100)) RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.live_submit_manual_pass(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_live_pass(_pass_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO r FROM live_session_passes WHERE id=_pass_id AND status='pending_review' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment already reviewed'; END IF;
  UPDATE live_session_passes SET status = CASE WHEN _approve THEN 'paid' ELSE 'rejected' END,
    paid_at = CASE WHEN _approve THEN now() ELSE NULL END, reviewed_by=auth.uid(), reviewed_at=now(), admin_note=_note
  WHERE id=_pass_id;
  INSERT INTO notifications(user_id, title, message, type)
  VALUES (r.user_id, CASE WHEN _approve THEN 'Live pass approved' ELSE 'Live pass payment rejected' END,
    CASE WHEN _approve THEN 'Your payment was approved. You can now go live.' ELSE 'Your payment proof was rejected.'||coalesce(' Reason: '||_note,'') END, 'live');
END $$;
GRANT EXECUTE ON FUNCTION public.admin_review_live_pass(uuid,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_platform_profit_summary(_days integer DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE since timestamptz := now() - make_interval(days => greatest(_days,1));
  gross numeric; margin numeric; comm numeric; ord int; fs numeric; fc numeric;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT coalesce(sum(o.total_amount),0), count(*) INTO gross, ord FROM orders o
    WHERE o.status <> 'cancelled' AND o.created_at >= since;
  SELECT coalesce(sum((oi.unit_price - coalesce(p.base_price,0)) * oi.quantity),0) INTO margin
    FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status <> 'cancelled' AND o.created_at >= since;
  SELECT coalesce(sum(amount),0) INTO comm FROM commissions WHERE created_at >= since;
  SELECT coalesce(sum(amount),0), coalesce(sum(commissions_paid),0) INTO fs, fc FROM feature_sales WHERE created_at >= since;
  RETURN jsonb_build_object('days',_days,'orders',ord,'gross_sales',gross,'gross_margin',margin,
    'commissions_paid',comm + fc,'feature_sales',fs,'feature_commissions',fc,'net_profit',margin + fs - comm - fc,
    'travel_clicks',(SELECT count(*) FROM travel_clicks WHERE created_at >= since),
    'new_users',(SELECT count(*) FROM profiles WHERE created_at >= since));
END $function$;