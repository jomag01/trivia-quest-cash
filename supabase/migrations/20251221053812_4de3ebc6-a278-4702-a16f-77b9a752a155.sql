-- Add UPDATE policy for binary_ai_purchases to allow admins to approve/reject
CREATE POLICY "Admins can update purchases" 
ON public.binary_ai_purchases 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add policy for admins to insert user_ai_credits on behalf of users
CREATE POLICY "Admins can insert AI credits" 
ON public.user_ai_credits 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add policy for admins to update user_ai_credits on behalf of users
CREATE POLICY "Admins can update AI credits" 
ON public.user_ai_credits 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Add policy for admins to view all user AI credits
CREATE POLICY "Admins can view all AI credits" 
ON public.user_ai_credits 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);