-- Drop existing insert policy
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

-- Create new insert policy that allows:
-- 1. Existing admins to create roles
-- 2. Anyone to create the first admin if no admins exist (bootstrap)
CREATE POLICY "Allow admin role creation"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if user is already an admin
  public.has_role(auth.uid(), 'admin')
  OR
  -- Allow creating the first admin if no admins exist
  (
    role = 'admin' 
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE role = 'admin'
    )
  )
);