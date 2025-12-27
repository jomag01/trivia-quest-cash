-- Add policy for admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop the old generic policy on affiliate_current_rank and create proper admin policies
DROP POLICY IF EXISTS "System can manage current rank" ON public.affiliate_current_rank;

-- Allow admins to do all operations on affiliate_current_rank
CREATE POLICY "Admins can manage all affiliate ranks"
ON public.affiliate_current_rank
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow users to insert their own rank if not exists
CREATE POLICY "Users can insert their own rank"
ON public.affiliate_current_rank
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own rank
CREATE POLICY "Users can update their own rank"
ON public.affiliate_current_rank
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);