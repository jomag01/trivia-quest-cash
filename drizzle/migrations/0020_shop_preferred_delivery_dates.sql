ALTER TABLE public.orders ADD COLUMN preferred_delivery_date date;
COMMENT ON COLUMN public.orders.preferred_delivery_date IS 'Optional requested arrival date, subject to seller and courier availability.';
CREATE OR REPLACE FUNCTION public.validate_order_delivery_date() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' OR NEW.preferred_delivery_date IS DISTINCT FROM OLD.preferred_delivery_date THEN
  IF NEW.preferred_delivery_date IS NOT NULL AND (NOT isfinite(NEW.preferred_delivery_date) OR NEW.preferred_delivery_date < (now() AT TIME ZONE 'Asia/Manila')::date) THEN
   RAISE EXCEPTION 'Preferred delivery date must be today or later';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER validate_order_delivery_date BEFORE INSERT OR UPDATE OF preferred_delivery_date ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_order_delivery_date();
CREATE OR REPLACE FUNCTION public.get_shop_seller_order_ids() RETURNS TABLE(id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT DISTINCT oi.order_id FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE p.seller_id = auth.uid()
 UNION SELECT o.id FROM public.orders o WHERE o.seller_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_shop_seller_order_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shop_seller_order_ids() TO authenticated;
CREATE POLICY "Sellers read orders containing their products" ON public.orders FOR SELECT TO authenticated USING (id IN (SELECT public.get_shop_seller_order_ids()));