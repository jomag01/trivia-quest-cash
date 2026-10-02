ALTER TABLE public.products ADD COLUMN IF NOT EXISTS network_commission_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.trg_feature_sale_order_delivered() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE it record;
BEGIN
  IF NEW.status='delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    FOR it IN SELECT oi.id, oi.quantity, oi.unit_price, p.base_price FROM order_items oi JOIN products p ON p.id=oi.product_id
      WHERE oi.order_id=NEW.id AND p.network_commission_enabled AND NOT coalesce(p.exclude_from_affiliate,false) LOOP
      PERFORM record_feature_sale(NEW.user_id,'shop_product', greatest(coalesce(it.unit_price,0)-coalesce(it.base_price,0),0)*coalesce(it.quantity,1), it.id, coalesce(NEW.payment_method,'order'));
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_feature_sale_order ON public.orders;
CREATE TRIGGER trg_feature_sale_order AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.trg_feature_sale_order_delivered();

CREATE OR REPLACE FUNCTION public.trg_feature_sale_ad_spend() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('approved','active','completed','paid') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM record_feature_sale(NEW.seller_id,'ads_campaign', coalesce(NEW.total_budget,0), NEW.id, coalesce(NEW.payment_method,'manual'));
  END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_feature_sale_ad_spend ON public.ad_spend_requests;
CREATE TRIGGER trg_feature_sale_ad_spend AFTER INSERT OR UPDATE OF status ON public.ad_spend_requests FOR EACH ROW EXECUTE FUNCTION public.trg_feature_sale_ad_spend();

CREATE OR REPLACE FUNCTION public.trg_feature_sale_sponsored() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('approved','active','completed','paid') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM record_feature_sale(NEW.user_id,'ads_sponsored_listing', coalesce(NEW.budget_amount,0), NEW.id, 'manual');
  END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_feature_sale_sponsored ON public.sponsored_listings;
CREATE TRIGGER trg_feature_sale_sponsored AFTER INSERT OR UPDATE OF status ON public.sponsored_listings FOR EACH ROW EXECUTE FUNCTION public.trg_feature_sale_sponsored();

CREATE OR REPLACE FUNCTION public.trg_feature_sale_beesmate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('approved','active','completed','paid') AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM record_feature_sale(NEW.user_id,'beesmate_premium', coalesce(NEW.amount_paid,0), NEW.id, coalesce(NEW.payment_method,'manual'));
  END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_feature_sale_beesmate ON public.beesmate_subscription_payments;
CREATE TRIGGER trg_feature_sale_beesmate AFTER INSERT OR UPDATE OF status ON public.beesmate_subscription_payments FOR EACH ROW EXECUTE FUNCTION public.trg_feature_sale_beesmate();

-- Server-priced AI tool unlock (credits) that also records a commissionable sale
CREATE OR REPLACE FUNCTION public.ai_unlock_feature(_feature_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _cost int; _bal numeric; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  _cost := CASE _feature_id WHEN 'web-scraper' THEN 25 WHEN 'website-builder' THEN 50 WHEN 'creator-analytics' THEN 30
    WHEN 'social-media' THEN 40 WHEN 'ads-maker' THEN 35 WHEN 'blog-maker' THEN 20 WHEN 'market-analysis' THEN 30
    WHEN 'email-marketing' THEN 25 ELSE NULL END;
  IF _cost IS NULL THEN RAISE EXCEPTION 'Unknown feature'; END IF;
  SELECT credits INTO _bal FROM profiles WHERE id=_uid FOR UPDATE;
  IF coalesce(_bal,0) < _cost THEN RAISE EXCEPTION 'Not enough credits'; END IF;
  UPDATE profiles SET credits = credits - _cost WHERE id=_uid;
  PERFORM record_feature_sale(_uid, 'ai_tool_'||replace(_feature_id,'-','_'), _cost, gen_random_uuid(), 'credits');
  RETURN _cost;
END $$;
REVOKE ALL ON FUNCTION public.ai_unlock_feature(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ai_unlock_feature(text) TO authenticated;

INSERT INTO public.paid_feature_commissions(feature_key,label,category,description,commission_type,referrer_value,upline_value,unilevel_pct,stairstep_pct,leadership_pct,is_active) VALUES
 ('shop_product','Selected shop products','shop','Paid on the profit (price minus seller cost) of products you switch on below, when the order is delivered.','percentage',10,5,3,2,1,true),
 ('ads_campaign','Ad campaigns','ads','When an ad campaign request is approved.','percentage',10,5,3,2,1,true),
 ('ads_sponsored_listing','Sponsored listings','ads','When a sponsored listing is approved.','percentage',10,5,3,2,1,true),
 ('beesmate_premium','BeesMate Premium','beesmate','When a BeesMate Premium payment is approved.','percentage',10,5,3,2,1,true),
 ('ai_tool_web_scraper','Scraper unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_website_builder','Website unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_creator_analytics','Analytics unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_social_media','Social unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_ads_maker','Ads Maker unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_blog_maker','Blog unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_market_analysis','Markets unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true),
 ('ai_tool_email_marketing','Email unlock','ai','Credits spent to unlock this AI tool.','percentage',5,3,2,1,1,true)
ON CONFLICT (feature_key) DO NOTHING;