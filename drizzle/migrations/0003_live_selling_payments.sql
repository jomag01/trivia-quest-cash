CREATE TABLE public.seller_pending_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'on_hold',
  release_at timestamptz NOT NULL DEFAULT now() + interval '15 days',
  released_at timestamptz,
  source text NOT NULL DEFAULT 'live_selling',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seller_pending_earnings TO authenticated;
GRANT ALL ON public.seller_pending_earnings TO service_role;
ALTER TABLE public.seller_pending_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers view own earnings" ON public.seller_pending_earnings FOR SELECT TO authenticated USING (seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Creates a pending live order (no payment yet). Returns order id + total.
CREATE OR REPLACE FUNCTION public.live_create_order(_product_id uuid, _qty int, _stream_id uuid, _name text, _phone text, _address text, _method text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; s record; _uid uuid := auth.uid(); _order uuid; _price numeric; _ship numeric; _total numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF _qty IS NULL OR _qty < 1 OR _qty > 50 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF coalesce(trim(_name),'')='' OR coalesce(trim(_address),'')='' OR coalesce(trim(_phone),'')='' THEN RAISE EXCEPTION 'Name, phone and address are required'; END IF;
  SELECT * INTO p FROM products WHERE id=_product_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product not available'; END IF;
  IF coalesce(p.stock_quantity,0) < _qty THEN RAISE EXCEPTION 'Not enough stock'; END IF;
  SELECT id, user_id INTO s FROM live_streams WHERE id=_stream_id;
  _price := coalesce(p.final_price, p.base_price);
  _ship := CASE WHEN p.free_shipping THEN 0 ELSE coalesce(p.shipping_fee,0) END;
  _total := _price*_qty + _ship;
  INSERT INTO orders(user_id, order_number, total_amount, status, shipping_address, customer_name, customer_phone, shipping_fee, payment_method, live_stream_id, live_streamer_id, seller_id, commission_status)
  VALUES (_uid, generate_order_number(), _total, 'pending', _address, _name, _phone, _ship, _method, s.id, s.user_id, p.seller_id, 'awaiting_payment')
  RETURNING id INTO _order;
  INSERT INTO order_items(order_id, product_id, quantity, unit_price, subtotal) VALUES (_order, p.id, _qty, _price, _price*_qty);
  RETURN jsonb_build_object('order_id', _order, 'total', _total, 'name', p.name);
END $$;

-- Marks an order paid: reduces stock, credits seller share as on-hold earnings.
CREATE OR REPLACE FUNCTION public.live_mark_order_paid(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; it record; _share numeric := 0;
BEGIN
  SELECT * INTO o FROM orders WHERE id=_order_id FOR UPDATE;
  IF NOT FOUND OR o.commission_status <> 'awaiting_payment' THEN RETURN; END IF;
  FOR it IN SELECT oi.quantity, oi.unit_price, pr.id pid, pr.base_price FROM order_items oi JOIN products pr ON pr.id=oi.product_id WHERE oi.order_id=_order_id LOOP
    UPDATE products SET stock_quantity = greatest(coalesce(stock_quantity,0)-it.quantity,0) WHERE id=it.pid;
    _share := _share + coalesce(it.base_price, it.unit_price) * it.quantity;
  END LOOP;
  _share := _share + coalesce(o.shipping_fee,0);
  UPDATE orders SET status='processing', commission_status='pending', commission_hold_until=now()+interval '15 days', updated_at=now() WHERE id=_order_id;
  IF o.seller_id IS NOT NULL THEN
    INSERT INTO seller_pending_earnings(seller_id, order_id, amount) VALUES (o.seller_id, _order_id, _share) ON CONFLICT (order_id) DO NOTHING;
    INSERT INTO notifications(user_id, title, message, type) VALUES (o.seller_id, 'Live sale!', 'You sold an item in your live. ₱'||round(_share,2)||' is on hold and unlocks after delivery or 15 days.', 'order');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.live_mark_order_paid(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_mark_order_paid(uuid) TO service_role;

-- Pays a pending live order from the buyer's Cash Wallet.
CREATE OR REPLACE FUNCTION public.live_pay_with_wallet(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record; w record; _uid uuid := auth.uid();
BEGIN
  SELECT * INTO o FROM orders WHERE id=_order_id AND user_id=_uid FOR UPDATE;
  IF NOT FOUND OR o.commission_status <> 'awaiting_payment' THEN RAISE EXCEPTION 'Order not payable'; END IF;
  SELECT * INTO w FROM cash_wallets WHERE user_id=_uid FOR UPDATE;
  IF NOT FOUND OR w.balance < o.total_amount THEN RAISE EXCEPTION 'Insufficient Cash Wallet balance'; END IF;
  UPDATE cash_wallets SET balance=balance-o.total_amount, updated_at=now() WHERE id=w.id;
  INSERT INTO cash_transactions(user_id, transaction_type, amount, balance_before, balance_after, description, reference_type, reference_id)
  VALUES (_uid, 'purchase', -o.total_amount, w.balance, w.balance-o.total_amount, 'Live selling order '||o.order_number, 'order', _order_id::text);
  UPDATE orders SET payment_method='cash_wallet' WHERE id=_order_id;
  PERFORM live_mark_order_paid(_order_id);
  RETURN jsonb_build_object('ok', true, 'order_number', o.order_number);
END $$;

-- Moves the seller's matured earnings (delivered or past hold) into their Cash Wallet.
CREATE OR REPLACE FUNCTION public.release_my_seller_earnings()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _sum numeric; w record;
BEGIN
  WITH due AS (
    UPDATE seller_pending_earnings e SET status='released', released_at=now()
    FROM orders o WHERE o.id=e.order_id AND e.seller_id=_uid AND e.status='on_hold'
      AND o.status NOT IN ('cancelled') AND o.return_requested_at IS NULL
      AND (o.status='delivered' OR e.release_at<=now())
    RETURNING e.amount)
  SELECT coalesce(sum(amount),0) INTO _sum FROM due;
  IF _sum > 0 THEN
    INSERT INTO cash_wallets(user_id, balance) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
    SELECT * INTO w FROM cash_wallets WHERE user_id=_uid FOR UPDATE;
    UPDATE cash_wallets SET balance=balance+_sum, updated_at=now() WHERE id=w.id;
    INSERT INTO cash_transactions(user_id, transaction_type, amount, balance_before, balance_after, description, reference_type)
    VALUES (_uid, 'sale_earning', _sum, w.balance, w.balance+_sum, 'Released live selling earnings', 'seller_earnings');
  END IF;
  RETURN _sum;
END $$;
GRANT EXECUTE ON FUNCTION public.live_create_order(uuid,int,uuid,text,text,text,text), public.live_pay_with_wallet(uuid), public.release_my_seller_earnings() TO authenticated;