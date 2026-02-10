
-- Fix RLS for installment_providers: use has_role instead of profiles.is_admin
DROP POLICY IF EXISTS "Admins can manage providers" ON public.installment_providers;
CREATE POLICY "Admins can manage providers" ON public.installment_providers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Fix RLS for product_installment_settings: use has_role instead of profiles.is_admin
DROP POLICY IF EXISTS "Admins can manage installment settings" ON public.product_installment_settings;
CREATE POLICY "Admins can manage installment settings" ON public.product_installment_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- Fix RLS for installment_applications too
DROP POLICY IF EXISTS "Admins can manage applications" ON public.installment_applications;
CREATE POLICY "Admins can manage applications" ON public.installment_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );
