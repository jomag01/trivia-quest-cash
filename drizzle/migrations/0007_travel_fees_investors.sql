
CREATE TABLE public.travel_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'hotel' CHECK (category IN ('flight','hotel','tour','car','other')),
  description text,
  logo_url text,
  url_template text NOT NULL,
  commission_note text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.travel_partners TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.travel_partners TO authenticated;
GRANT ALL ON public.travel_partners TO service_role;
ALTER TABLE public.travel_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active partners" ON public.travel_partners FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage partners" ON public.travel_partners FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.travel_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.travel_partners(id) ON DELETE CASCADE,
  user_id uuid,
  ref_code text,
  search_query text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.travel_clicks TO anon, authenticated;
GRANT SELECT ON public.travel_clicks TO authenticated;
GRANT ALL ON public.travel_clicks TO service_role;
ALTER TABLE public.travel_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone logs clicks" ON public.travel_clicks FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Admins view clicks" ON public.travel_clicks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.platform_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_key text NOT NULL UNIQUE,
  label text NOT NULL,
  applies_to text NOT NULL DEFAULT 'shop',
  fee_type text NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage','fixed')),
  fee_value numeric NOT NULL DEFAULT 0 CHECK (fee_value >= 0),
  is_active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_fees TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_fees TO authenticated;
GRANT ALL ON public.platform_fees TO service_role;
ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views fees" ON public.platform_fees FOR SELECT USING (true);
CREATE POLICY "Admins manage fees" ON public.platform_fees FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.platform_fees (fee_key,label,applies_to,fee_type,fee_value) VALUES
 ('shop_service_fee','Shop service fee','shop','percentage',2),
 ('booking_fee','Booking convenience fee','booking','fixed',25),
 ('food_service_fee','Food service fee','food','fixed',10),
 ('live_selling_fee','Live selling platform fee','live','percentage',3);

CREATE TABLE public.investor_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 200),
  company text,
  phone text,
  investment_range text,
  message text CHECK (char_length(coalesce(message,'')) <= 2000),
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.investor_inquiries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.investor_inquiries TO authenticated;
GRANT ALL ON public.investor_inquiries TO service_role;
ALTER TABLE public.investor_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone submits inquiry" ON public.investor_inquiries FOR INSERT WITH CHECK (status = 'new');
CREATE POLICY "Admins manage inquiries" ON public.investor_inquiries FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.travel_partners (name,category,description,url_template,sort_order) VALUES
 ('Agoda','hotel','Hotels and resorts across Asia','https://www.agoda.com/search?textToSearch={q}',1),
 ('Booking.com','hotel','Hotels, homes and apartments worldwide','https://www.booking.com/searchresults.html?ss={q}',2),
 ('Skyscanner','flight','Compare cheap flights','https://www.skyscanner.com.ph/transport/flights-to/{q}',3),
 ('Klook','tour','Tours, activities and attractions','https://www.klook.com/search/?query={q}',4);

CREATE OR REPLACE FUNCTION public.get_public_traction()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM profiles),
    'orders', (SELECT count(*) FROM orders WHERE status <> 'cancelled'),
    'sellers', (SELECT count(DISTINCT seller_id) FROM orders WHERE seller_id IS NOT NULL),
    'live_streams', (SELECT count(*) FROM live_streams)
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_public_traction() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_platform_profit_summary(_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE since timestamptz := now() - make_interval(days => greatest(_days,1));
  gross numeric; margin numeric; comm numeric; ord int;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT coalesce(sum(o.total_amount),0), count(*) INTO gross, ord FROM orders o
    WHERE o.status <> 'cancelled' AND o.created_at >= since;
  SELECT coalesce(sum((oi.unit_price - coalesce(p.base_price,0)) * oi.quantity),0) INTO margin
    FROM order_items oi JOIN orders o ON o.id = oi.order_id LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.status <> 'cancelled' AND o.created_at >= since;
  SELECT coalesce(sum(amount),0) INTO comm FROM commissions WHERE created_at >= since;
  RETURN jsonb_build_object('days',_days,'orders',ord,'gross_sales',gross,'gross_margin',margin,
    'commissions_paid',comm,'net_profit',margin - comm,
    'travel_clicks',(SELECT count(*) FROM travel_clicks WHERE created_at >= since),
    'new_users',(SELECT count(*) FROM profiles WHERE created_at >= since));
END $$;
GRANT EXECUTE ON FUNCTION public.get_platform_profit_summary(int) TO authenticated;
