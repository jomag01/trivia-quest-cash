-- Fix RLS policy for marketplace_settings to allow admin updates
DROP POLICY IF EXISTS "Admins can manage marketplace settings" ON public.marketplace_settings;

CREATE POLICY "Admins can manage marketplace settings" 
ON public.marketplace_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);