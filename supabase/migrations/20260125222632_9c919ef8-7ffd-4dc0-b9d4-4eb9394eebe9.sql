-- Fix orders table - require authentication
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create own orders" ON orders;
DROP POLICY IF EXISTS "Guest orders require email validation" ON orders;

CREATE POLICY "Authenticated users can create own orders" 
ON orders FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);