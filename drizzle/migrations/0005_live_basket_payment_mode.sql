ALTER TABLE public.live_stream_products ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'both';
ALTER TABLE public.live_stream_products ADD CONSTRAINT live_stream_products_payment_mode_chk CHECK (payment_mode IN ('ewallet','cod','both'));

CREATE OR REPLACE FUNCTION public.live_create_order(_product_id uuid, _qty integer, _stream_id uuid, _name text, _phone text, _address text, _method text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE p record; s record; _uid uuid := auth.uid(); _order uuid; _price numeric; _ship numeric; _total numeric; _mode text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF _qty IS NULL OR _qty < 1 OR _qty > 50 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF coalesce(trim(_name),'')='' OR coalesce(trim(_address),'')='' OR coalesce(trim(_phone),'')='' THEN RAISE EXCEPTION 'Name, phone and address are required'; END IF;
  IF _method NOT IN ('cash_wallet','paymongo','cod') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  SELECT * INTO p FROM products WHERE id=_product_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF coalesce(p.stock_quantity,0) < _qty THEN RAISE EXCEPTION 'Not enough stock'; END IF;
  SELECT id, user_id INTO s FROM live_streams WHERE id=_stream_id;
  SELECT coalesce(payment_mode,'both') INTO _mode FROM live_stream_products WHERE stream_id=_stream_id AND product_id=_product_id LIMIT 1;
  _mode := coalesce(_mode,'both');
  IF _method='cod' AND _mode='ewallet' THEN RAISE EXCEPTION 'Seller accepts e-wallet payment only for this item'; END IF;
  IF _method<>'cod' AND _mode='cod' THEN RAISE EXCEPTION 'Seller accepts Cash on Delivery only for this item'; END IF;
  _price := coalesce(p.final_price, p.base_price);
  _ship := CASE WHEN p.free_shipping THEN 0 ELSE coalesce(p.shipping_fee,0) END;
  _total := _price*_qty + _ship;
  INSERT INTO orders(user_id, order_number, total_amount, status, shipping_address, customer_name, customer_phone, shipping_fee, payment_method, live_stream_id, live_streamer_id, seller_id, commission_status)
  VALUES (_uid, generate_order_number(), _total, 'pending', _address, _name, _phone, _ship, _method, s.id, s.user_id, p.seller_id,
          CASE WHEN _method='cod' THEN 'cod_pending' ELSE 'awaiting_payment' END)
  RETURNING id INTO _order;
  INSERT INTO order_items(order_id, product_id, quantity, unit_price, subtotal) VALUES (_order, p.id, _qty, _price, _price*_qty);
  IF _method='cod' THEN
    UPDATE products SET stock_quantity = stock_quantity - _qty WHERE id=p.id;
    IF p.seller_id IS NOT NULL THEN
      INSERT INTO notifications(user_id, title, message, type)
      SELECT sp.user_id, 'New COD live order', 'A viewer ordered '||p.name||' x'||_qty||' (Cash on Delivery, ₱'||_total||').', 'order'
      FROM suppliers sp WHERE sp.id=p.seller_id;
    END IF;
  END IF;
  RETURN jsonb_build_object('order_id', _order, 'total', _total, 'name', p.name);
END $function$;