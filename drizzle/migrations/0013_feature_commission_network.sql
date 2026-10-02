ALTER TABLE public.paid_feature_commissions
  ADD COLUMN IF NOT EXISTS unilevel_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unilevel_levels integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS stairstep_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leadership_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;

CREATE OR REPLACE FUNCTION public._feature_credit(_earner uuid, _buyer uuid, _sale uuid, _key text, _level int, _amt numeric, _kind text, _label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _earner IS NULL OR _amt IS NULL OR _amt <= 0 THEN RETURN; END IF;
  INSERT INTO feature_commission_earnings(sale_id,earner_id,buyer_id,feature_key,level,amount) VALUES (_sale,_earner,_buyer,_key,_level,_amt);
  INSERT INTO commissions(user_id, from_user_id, amount, commission_type, level, related_order_id, notes)
    VALUES (_earner, _buyer, _amt, _kind, _level, _sale, initcap(_kind)||' from '||_label);
  INSERT INTO user_wallets(user_id,balance,total_commissions) VALUES (_earner,_amt,_amt)
    ON CONFLICT (user_id) DO UPDATE SET balance=coalesce(user_wallets.balance,0)+_amt, total_commissions=coalesce(user_wallets.total_commissions,0)+_amt;
  INSERT INTO commission_notifications(user_id,source_type,amount,message)
    VALUES (_earner,'paid_features',_amt,'You earned ₱'||to_char(_amt,'FM999999990.00')||' ('||_kind||') from '||_label||'!');
END $$;
REVOKE EXECUTE ON FUNCTION public._feature_credit(uuid,uuid,uuid,text,int,numeric,text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_feature_sale(_user_id uuid, _feature_key text, _amount numeric, _source_id uuid, _method text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; _sale uuid; _ref uuid; _up uuid; a numeric; total numeric := 0; lvl int; cur uuid; w numeric; wsum numeric := 0; r record; n int;
BEGIN
  INSERT INTO feature_sales(user_id, feature_key, amount, payment_method, source_id)
  VALUES (_user_id, _feature_key, coalesce(_amount,0), _method, _source_id)
  ON CONFLICT (feature_key, source_id) DO NOTHING RETURNING id INTO _sale;
  IF _sale IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO s FROM paid_feature_commissions WHERE feature_key=_feature_key AND is_active;
  IF NOT FOUND OR coalesce(_amount,0) <= 0 THEN RETURN _sale; END IF;
  SELECT referred_by INTO _ref FROM profiles WHERE id=_user_id;
  IF _ref IS NULL OR _ref = _user_id THEN RETURN _sale; END IF;

  -- Direct referral (L1) and its upline (L2)
  a := CASE WHEN s.commission_type='fixed' THEN s.referrer_value ELSE round(_amount*s.referrer_value/100.0,2) END;
  PERFORM _feature_credit(_ref,_user_id,_sale,_feature_key,1,a,'referral',s.label); total := total + greatest(a,0);
  SELECT referred_by INTO _up FROM profiles WHERE id=_ref;
  IF _up IS NOT NULL AND _up NOT IN (_ref,_user_id) THEN
    a := CASE WHEN s.commission_type='fixed' THEN s.upline_value ELSE round(_amount*s.upline_value/100.0,2) END;
    PERFORM _feature_credit(_up,_user_id,_sale,_feature_key,2,a,'referral',s.label); total := total + greatest(a,0);
  END IF;

  -- Unilevel pool spread across levels using the global level weights
  IF s.unilevel_pct > 0 THEN
    FOR lvl IN 1..greatest(1,least(s.unilevel_levels,10)) LOOP
      SELECT coalesce((SELECT value::numeric FROM app_settings WHERE key='unilevel_level_'||lvl||'_percent'),
        CASE lvl WHEN 1 THEN 4 WHEN 2 THEN 3 WHEN 3 THEN 2.5 WHEN 4 THEN 2 WHEN 5 THEN 1.5 WHEN 6 THEN 1 ELSE 0.5 END) INTO w;
      wsum := wsum + w;
    END LOOP;
    cur := _ref; lvl := 1;
    WHILE cur IS NOT NULL AND lvl <= least(s.unilevel_levels,10) LOOP
      SELECT coalesce((SELECT value::numeric FROM app_settings WHERE key='unilevel_level_'||lvl||'_percent'),
        CASE lvl WHEN 1 THEN 4 WHEN 2 THEN 3 WHEN 3 THEN 2.5 WHEN 4 THEN 2 WHEN 5 THEN 1.5 WHEN 6 THEN 1 ELSE 0.5 END) INTO w;
      a := round(_amount*s.unilevel_pct/100.0*w/nullif(wsum,0),2);
      PERFORM _feature_credit(cur,_user_id,_sale,_feature_key,lvl,a,'unilevel',s.label); total := total + coalesce(a,0);
      SELECT referred_by INTO cur FROM profiles WHERE id=cur;
      IF cur = _user_id THEN EXIT; END IF;
      lvl := lvl + 1;
    END LOOP;
  END IF;

  -- Stairstep pool: split between the nearest 2 qualified uplines (step 3+)
  IF s.stairstep_pct > 0 THEN
    n := 0;
    FOR r IN WITH RECURSIVE up AS (
        SELECT referred_by uid, 1 d FROM profiles WHERE id=_user_id
        UNION ALL SELECT p.referred_by, up.d+1 FROM profiles p JOIN up ON p.id=up.uid WHERE up.d < 20)
      SELECT up.uid, acr.current_step FROM up JOIN affiliate_current_rank acr ON acr.user_id=up.uid
      WHERE up.uid IS NOT NULL AND up.uid <> _user_id AND acr.current_step >= 3 ORDER BY up.d LIMIT 2 LOOP
      n := n + 1;
    END LOOP;
    IF n > 0 THEN
      FOR r IN WITH RECURSIVE up AS (
          SELECT referred_by uid, 1 d FROM profiles WHERE id=_user_id
          UNION ALL SELECT p.referred_by, up.d+1 FROM profiles p JOIN up ON p.id=up.uid WHERE up.d < 20)
        SELECT up.uid, acr.current_step FROM up JOIN affiliate_current_rank acr ON acr.user_id=up.uid
        WHERE up.uid IS NOT NULL AND up.uid <> _user_id AND acr.current_step >= 3 ORDER BY up.d LIMIT 2 LOOP
        a := round(_amount*s.stairstep_pct/100.0/n,2);
        PERFORM _feature_credit(r.uid,_user_id,_sale,_feature_key,r.current_step,a,'stairstep',s.label); total := total + a;
      END LOOP;
    END IF;
  END IF;

  -- Leadership pool: nearest upline at step 5+
  IF s.leadership_pct > 0 THEN
    SELECT up.uid INTO cur FROM (WITH RECURSIVE up AS (
        SELECT referred_by uid, 1 d FROM profiles WHERE id=_user_id
        UNION ALL SELECT p.referred_by, up.d+1 FROM profiles p JOIN up ON p.id=up.uid WHERE up.d < 20)
      SELECT * FROM up) up JOIN affiliate_current_rank acr ON acr.user_id=up.uid
      WHERE up.uid IS NOT NULL AND up.uid <> _user_id AND acr.current_step >= 5 ORDER BY up.d LIMIT 1;
    IF cur IS NOT NULL THEN
      a := round(_amount*s.leadership_pct/100.0,2);
      PERFORM _feature_credit(cur,_user_id,_sale,_feature_key,5,a,'leadership',s.label); total := total + a;
    END IF;
  END IF;

  UPDATE feature_sales SET commissions_paid=total WHERE id=_sale;
  RETURN _sale;
END $$;
REVOKE EXECUTE ON FUNCTION public.record_feature_sale(uuid,text,numeric,uuid,text) FROM PUBLIC, anon, authenticated;

-- Hook other money-paid features into the sales system
CREATE OR REPLACE FUNCTION public.trg_ai_sub_history_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(NEW.amount_paid,0) > 0 THEN
    PERFORM record_feature_sale(NEW.user_id, 'ai_subscription_'||coalesce(NEW.plan_type,'plan'), NEW.amount_paid, NEW.id, NEW.payment_method);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ai_sub_history_sale AFTER INSERT ON public.ai_subscription_history FOR EACH ROW EXECUTE FUNCTION public.trg_ai_sub_history_sale();

CREATE OR REPLACE FUNCTION public.trg_ai_topup_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','completed') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM record_feature_sale(NEW.user_id, 'ai_credit_topup', NEW.amount, NEW.id, NEW.payment_method);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ai_topup_sale AFTER INSERT OR UPDATE OF status ON public.ai_credit_topups FOR EACH ROW EXECUTE FUNCTION public.trg_ai_topup_sale();

CREATE OR REPLACE FUNCTION public.trg_ai_credit_purchase_sale() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('approved','completed') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM record_feature_sale(NEW.user_id, 'ai_credit_purchase', NEW.amount, NEW.id, NEW.payment_method);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ai_credit_purchase_sale AFTER INSERT OR UPDATE OF status ON public.ai_credit_purchases FOR EACH ROW EXECUTE FUNCTION public.trg_ai_credit_purchase_sale();