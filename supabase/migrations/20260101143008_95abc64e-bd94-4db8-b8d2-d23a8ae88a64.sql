-- =========================================
-- FLEXIBLE FEATURES & SLIDER ADS SYSTEM
-- =========================================

-- 1. Admin-defined features that can be applied to different entity types
CREATE TABLE IF NOT EXISTS public.listing_feature_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'marketplace', 'restaurant', 'service', 'product'
  feature_name TEXT NOT NULL,
  feature_label TEXT NOT NULL,
  feature_type TEXT NOT NULL DEFAULT 'boolean', -- 'boolean', 'text', 'number', 'select'
  options JSONB DEFAULT '[]', -- For select type: ["Option1", "Option2"]
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, feature_name)
);

ALTER TABLE public.listing_feature_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feature definitions"
ON public.listing_feature_definitions FOR SELECT USING (true);

CREATE POLICY "Admins can manage feature definitions"
ON public.listing_feature_definitions FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 2. Seller-selected features for their listings
CREATE TABLE IF NOT EXISTS public.listing_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  feature_definition_id UUID NOT NULL REFERENCES public.listing_feature_definitions(id) ON DELETE CASCADE,
  feature_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(entity_type, entity_id, feature_definition_id)
);

ALTER TABLE public.listing_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read listing features"
ON public.listing_features FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage listing features"
ON public.listing_features FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Slider ad placement settings
CREATE TABLE IF NOT EXISTS public.slider_ad_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_key TEXT NOT NULL UNIQUE,
  placement_label TEXT NOT NULL,
  description TEXT,
  fee_per_day INTEGER DEFAULT 10,
  min_duration_days INTEGER DEFAULT 1,
  max_duration_days INTEGER DEFAULT 30,
  max_ads_shown INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.slider_ad_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read slider settings"
ON public.slider_ad_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage slider settings"
ON public.slider_ad_settings FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert default placements
INSERT INTO public.slider_ad_settings (placement_key, placement_label, description, fee_per_day, display_order) VALUES
('shop_top', 'Shop - Top Banner', 'Featured ad slider at the top of the shop page', 20, 1),
('shop_featured', 'Shop - Featured Products', 'Slider in the featured products section', 15, 2),
('food_top', 'Food - Top Banner', 'Featured ad slider at the top of food delivery page', 15, 3),
('marketplace_top', 'Marketplace - Top Banner', 'Featured ad slider at the top of marketplace', 15, 4),
('home_hero', 'Home - Hero Section', 'Premium placement on homepage hero', 30, 5)
ON CONFLICT (placement_key) DO NOTHING;

-- 4. Seller promoted slider ads
CREATE TABLE IF NOT EXISTS public.seller_slider_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  placement_id UUID NOT NULL REFERENCES public.slider_ad_settings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  link_type TEXT DEFAULT 'product',
  link_entity_id UUID,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  diamonds_paid INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.seller_slider_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read slider ads"
ON public.seller_slider_ads FOR SELECT
USING (status = 'active' OR seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Sellers create ads"
ON public.seller_slider_ads FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers and admins update ads"
ON public.seller_slider_ads FOR UPDATE
USING (seller_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins delete ads"
ON public.seller_slider_ads FOR DELETE
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Slider ad impressions
CREATE TABLE IF NOT EXISTS public.slider_ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.seller_slider_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.slider_ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can track impressions"
ON public.slider_ad_impressions FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners and admins read impressions"
ON public.slider_ad_impressions FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.seller_slider_ads WHERE id = ad_id AND seller_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_slider_ads;