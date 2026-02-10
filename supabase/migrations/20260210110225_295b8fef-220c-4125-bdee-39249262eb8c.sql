
-- Drop all existing policies on installment tables and recreate properly
DROP POLICY IF EXISTS "Admins can manage providers" ON public.installment_providers;
DROP POLICY IF EXISTS "Anyone can view active providers" ON public.installment_providers;
DROP POLICY IF EXISTS "Admins can manage installment settings" ON public.product_installment_settings;
DROP POLICY IF EXISTS "Anyone can view installment settings" ON public.product_installment_settings;
DROP POLICY IF EXISTS "Admins can manage applications" ON public.installment_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.installment_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.installment_applications;

-- installment_providers: public read, admin write
CREATE POLICY "Anyone can view active providers" ON public.installment_providers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert providers" ON public.installment_providers
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update providers" ON public.installment_providers
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete providers" ON public.installment_providers
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  );

-- product_installment_settings: authenticated read, admin write
CREATE POLICY "Authenticated can view installment settings" ON public.product_installment_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert installment settings" ON public.product_installment_settings
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update installment settings" ON public.product_installment_settings
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete installment settings" ON public.product_installment_settings
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  );

-- installment_applications: users own, admin all
CREATE POLICY "Users can view own applications" ON public.installment_applications
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create applications" ON public.installment_applications
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can update applications" ON public.installment_applications
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin')
  );
