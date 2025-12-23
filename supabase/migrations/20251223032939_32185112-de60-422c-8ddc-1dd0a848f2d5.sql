-- Table for retailer access to supplier products based on stairstep rank
CREATE TABLE IF NOT EXISTS public.retailer_supplier_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  max_stock_allowed INTEGER NOT NULL DEFAULT 10,
  current_stock_allocated INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  promotional_link TEXT,
  total_sales INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(retailer_id, supplier_product_id)
);

-- Stock limits based on stairstep rank
CREATE TABLE IF NOT EXISTS public.retailer_stock_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  max_products INTEGER NOT NULL DEFAULT 5,
  max_stock_per_product INTEGER NOT NULL DEFAULT 10,
  commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 5,
  can_promote_socials BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(step_number)
);

-- Retailer commissions from supplier product sales
CREATE TABLE IF NOT EXISTS public.retailer_supplier_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  order_id UUID,
  customer_id UUID REFERENCES auth.users(id),
  sale_amount NUMERIC(12,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL,
  commission_percentage NUMERIC(5,2) NOT NULL,
  source TEXT DEFAULT 'direct', -- 'direct', 'social_link', 'referral'
  social_platform TEXT, -- 'facebook', 'instagram', 'twitter', 'tiktok'
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- Retailer social media promotional links
CREATE TABLE IF NOT EXISTS public.retailer_promotional_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'instagram', 'twitter', 'tiktok', 'custom'
  link_code TEXT NOT NULL,
  full_link TEXT NOT NULL,
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(retailer_id, supplier_product_id, platform)
);

-- Enable RLS
ALTER TABLE public.retailer_supplier_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_stock_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_supplier_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retailer_promotional_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for retailer_supplier_access
CREATE POLICY "Retailers can view their own access" ON public.retailer_supplier_access
  FOR SELECT USING (auth.uid() = retailer_id);

CREATE POLICY "Retailers can manage their access" ON public.retailer_supplier_access
  FOR ALL USING (auth.uid() = retailer_id);

CREATE POLICY "Admins can manage all retailer access" ON public.retailer_supplier_access
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for retailer_stock_limits (public read, admin write)
CREATE POLICY "Anyone can view stock limits" ON public.retailer_stock_limits
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage stock limits" ON public.retailer_stock_limits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for retailer_supplier_commissions
CREATE POLICY "Retailers can view their commissions" ON public.retailer_supplier_commissions
  FOR SELECT USING (auth.uid() = retailer_id);

CREATE POLICY "Admins can manage all commissions" ON public.retailer_supplier_commissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for retailer_promotional_links
CREATE POLICY "Retailers can view their links" ON public.retailer_promotional_links
  FOR SELECT USING (auth.uid() = retailer_id);

CREATE POLICY "Retailers can manage their links" ON public.retailer_promotional_links
  FOR ALL USING (auth.uid() = retailer_id);

CREATE POLICY "Admins can manage all links" ON public.retailer_promotional_links
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default stock limits for each stairstep level
INSERT INTO public.retailer_stock_limits (step_number, step_name, max_products, max_stock_per_product, commission_percentage)
VALUES 
  (1, 'Bronze', 5, 10, 5),
  (2, 'Silver', 10, 25, 7),
  (3, 'Gold', 20, 50, 10),
  (4, 'Platinum', 50, 100, 12),
  (5, 'Diamond', 100, 200, 15),
  (6, 'Elite', 200, 500, 18),
  (7, 'Master', 500, 1000, 20)
ON CONFLICT (step_number) DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_retailer_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_retailer_supplier_access_updated_at
  BEFORE UPDATE ON public.retailer_supplier_access
  FOR EACH ROW EXECUTE FUNCTION update_retailer_tables_updated_at();

CREATE TRIGGER update_retailer_stock_limits_updated_at
  BEFORE UPDATE ON public.retailer_stock_limits
  FOR EACH ROW EXECUTE FUNCTION update_retailer_tables_updated_at();

CREATE TRIGGER update_retailer_promotional_links_updated_at
  BEFORE UPDATE ON public.retailer_promotional_links
  FOR EACH ROW EXECUTE FUNCTION update_retailer_tables_updated_at();