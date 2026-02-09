
-- Installment providers (financing companies)
CREATE TABLE public.installment_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  interest_rate_percent NUMERIC DEFAULT 0,
  min_amount NUMERIC DEFAULT 0,
  max_amount NUMERIC,
  available_terms INTEGER[] DEFAULT '{3,6,12}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products eligible for installment
CREATE TABLE public.product_installment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.installment_providers(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  custom_terms INTEGER[],
  custom_interest_rate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, provider_id)
);

-- Installment applications from buyers
CREATE TABLE public.installment_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  provider_id UUID NOT NULL REFERENCES public.installment_providers(id),
  order_id UUID,
  total_amount NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  interest_rate NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.installment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_installment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_applications ENABLE ROW LEVEL SECURITY;

-- Providers: public read, admin write
CREATE POLICY "Anyone can view active providers" ON public.installment_providers FOR SELECT USING (true);
CREATE POLICY "Admins can manage providers" ON public.installment_providers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Product installment settings: public read, admin write
CREATE POLICY "Anyone can view installment settings" ON public.product_installment_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage installment settings" ON public.product_installment_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Applications: users see own, admins see all
CREATE POLICY "Users can view own applications" ON public.installment_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create applications" ON public.installment_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage applications" ON public.installment_applications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);
