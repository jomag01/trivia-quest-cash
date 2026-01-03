-- Allow users to update their own orders (for cancellation)
CREATE POLICY "Users can update their own pending orders"
ON public.orders
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND status IN ('pending', 'pending_payment')
)
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'cancelled'
);