-- Fix admin order update permissions

-- Drop all existing policies on orders table to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON orders;

-- Create clean, working policies for orders
CREATE POLICY "Users can view their own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all orders"
ON orders FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Drop and recreate order_status_history policies
DROP POLICY IF EXISTS "Users can view their order status history" ON order_status_history;
DROP POLICY IF EXISTS "Admins can view all order status history" ON order_status_history;
DROP POLICY IF EXISTS "Admins can insert order status history" ON order_status_history;

CREATE POLICY "Users can view their order status history"
ON order_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_history.order_id
    AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
  )
);

CREATE POLICY "Admins can view all order status history"
ON order_status_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow trigger to insert status history (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Allow status history inserts from trigger"
ON order_status_history FOR INSERT
WITH CHECK (true);