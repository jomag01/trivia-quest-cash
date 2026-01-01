-- 1. Add listing duration settings table
CREATE TABLE IF NOT EXISTS public.listing_duration_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_diamonds INTEGER NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.listing_duration_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read listing duration tiers"
ON public.listing_duration_tiers FOR SELECT USING (true);

CREATE POLICY "Admins can manage listing duration tiers"
ON public.listing_duration_tiers FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert default tiers
INSERT INTO public.listing_duration_tiers (tier_name, duration_days, price_diamonds, is_default, display_order) VALUES
  ('Free Trial', 7, 0, true, 1),
  ('Standard', 30, 50, false, 2),
  ('Premium', 90, 120, false, 3),
  ('Featured', 180, 200, false, 4);

-- 2. Add listing expiry to marketplace_listings if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_listings' AND column_name = 'expires_at') THEN
    ALTER TABLE public.marketplace_listings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_listings' AND column_name = 'duration_tier_id') THEN
    ALTER TABLE public.marketplace_listings ADD COLUMN duration_tier_id UUID REFERENCES public.listing_duration_tiers(id);
  END IF;
END $$;

-- 3. Create ad revenue distribution settings table
CREATE TABLE IF NOT EXISTS public.ad_revenue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ad_revenue_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad revenue settings"
ON public.ad_revenue_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage ad revenue settings"
ON public.ad_revenue_settings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert default revenue distribution percentages
INSERT INTO public.ad_revenue_settings (setting_key, setting_value, description) VALUES
  ('admin_net_profit_percentage', '40', 'Admin net profit percentage from ad revenue'),
  ('unilevel_pool_percentage', '25', 'Unilevel commission pool percentage'),
  ('stairstep_pool_percentage', '20', 'Stair-step commission pool percentage'),
  ('leadership_pool_percentage', '15', 'Leadership commission pool percentage')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Create ad pricing tiers table
CREATE TABLE IF NOT EXISTS public.ad_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  price_diamonds INTEGER NOT NULL,
  impressions_included INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 7,
  priority_level INTEGER DEFAULT 1,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ad_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad pricing tiers"
ON public.ad_pricing_tiers FOR SELECT USING (true);

CREATE POLICY "Admins can manage ad pricing tiers"
ON public.ad_pricing_tiers FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert default pricing tiers
INSERT INTO public.ad_pricing_tiers (tier_name, price_diamonds, impressions_included, duration_days, priority_level, description, display_order) VALUES
  ('Starter', 50, 1000, 7, 1, 'Basic visibility for small businesses', 1),
  ('Standard', 150, 5000, 14, 2, 'Recommended for growing businesses', 2),
  ('Premium', 300, 15000, 30, 3, 'Enhanced visibility with higher priority', 3),
  ('Enterprise', 500, 50000, 30, 4, 'Maximum exposure for large campaigns', 4);

-- 5. Create ad target locations table
CREATE TABLE IF NOT EXISTS public.ad_target_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_type TEXT NOT NULL, -- country, region, province, city, barangay
  location_name TEXT NOT NULL,
  parent_id UUID REFERENCES public.ad_target_locations(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ad_target_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad target locations"
ON public.ad_target_locations FOR SELECT USING (true);

CREATE POLICY "Admins can manage ad target locations"
ON public.ad_target_locations FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert Philippines as default country
INSERT INTO public.ad_target_locations (location_type, location_name) VALUES ('country', 'Philippines');

-- 6. Create ad interest categories table  
CREATE TABLE IF NOT EXISTS public.ad_interest_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL,
  interests TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ad_interest_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ad interest categories"
ON public.ad_interest_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage ad interest categories"
ON public.ad_interest_categories FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert default interest categories
INSERT INTO public.ad_interest_categories (category_name, interests, display_order) VALUES
  ('Shopping & Fashion', ARRAY['Online Shopping', 'Fashion & Style', 'Beauty & Cosmetics', 'Jewelry', 'Shoes & Bags'], 1),
  ('Entertainment', ARRAY['Music', 'Movies', 'Gaming', 'K-Pop', 'Anime', 'TikTok Trends'], 2),
  ('Food & Dining', ARRAY['Food Lovers', 'Cooking', 'Restaurant Dining', 'Fast Food', 'Coffee & Tea'], 3),
  ('Technology', ARRAY['Mobile Devices', 'Gadgets', 'Tech News', 'Apps & Software'], 4),
  ('Sports & Fitness', ARRAY['Basketball', 'Fitness', 'Running', 'Volleyball', 'Boxing', 'Gym'], 5),
  ('Business', ARRAY['Entrepreneurship', 'Investing', 'Real Estate', 'Networking', 'E-commerce'], 6);

-- 7. Add enhanced fields to seller_slider_ads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'pricing_tier_id') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN pricing_tier_id UUID REFERENCES public.ad_pricing_tiers(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'max_impressions') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN max_impressions INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'target_locations') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN target_locations TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'target_interests') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN target_interests TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'target_age_min') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN target_age_min INTEGER DEFAULT 18;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'target_age_max') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN target_age_max INTEGER DEFAULT 65;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'target_gender') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN target_gender TEXT DEFAULT 'all';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seller_slider_ads' AND column_name = 'revenue_distributed') THEN
    ALTER TABLE public.seller_slider_ads ADD COLUMN revenue_distributed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 8. Create ad revenue distribution log
CREATE TABLE IF NOT EXISTS public.ad_revenue_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.seller_slider_ads(id) ON DELETE CASCADE,
  total_revenue INTEGER NOT NULL,
  admin_profit INTEGER NOT NULL,
  unilevel_distributed INTEGER NOT NULL DEFAULT 0,
  stairstep_distributed INTEGER NOT NULL DEFAULT 0,
  leadership_distributed INTEGER NOT NULL DEFAULT 0,
  seller_id UUID NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ad_revenue_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ad revenue distributions"
ON public.ad_revenue_distributions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Sellers can view own distributions"
ON public.ad_revenue_distributions FOR SELECT
USING (auth.uid() = seller_id);

-- 9. Add custom ads table for sellers creating their own image ads
CREATE TABLE IF NOT EXISTS public.seller_custom_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  link_type TEXT NOT NULL DEFAULT 'custom', -- shop, marketplace, restaurant, service, custom
  link_url TEXT,
  link_entity_id UUID,
  pricing_tier_id UUID REFERENCES public.ad_pricing_tiers(id),
  placement_id UUID REFERENCES public.slider_ad_settings(id),
  target_locations TEXT[],
  target_interests TEXT[],
  target_age_min INTEGER DEFAULT 18,
  target_age_max INTEGER DEFAULT 65,
  target_gender TEXT DEFAULT 'all',
  diamonds_paid INTEGER NOT NULL DEFAULT 0,
  max_impressions INTEGER DEFAULT 0,
  current_impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, active, paused, completed, rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.seller_custom_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own custom ads"
ON public.seller_custom_ads FOR SELECT
USING (auth.uid() = seller_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Sellers can create custom ads"
ON public.seller_custom_ads FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own custom ads"
ON public.seller_custom_ads FOR UPDATE
USING (auth.uid() = seller_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));