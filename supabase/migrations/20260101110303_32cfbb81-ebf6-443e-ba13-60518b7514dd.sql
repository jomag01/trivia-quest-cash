-- Add boosted listing columns to marketplace_listings
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_starts_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS boost_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS boost_level text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS boost_diamonds_paid integer DEFAULT 0;

-- Add boost pricing settings to marketplace_settings
INSERT INTO public.marketplace_settings (setting_key, setting_value) 
VALUES 
  ('boost_price_standard', '50'),
  ('boost_price_premium', '100'),
  ('boost_price_featured', '200'),
  ('boost_duration_days', '7'),
  ('free_listing_diamond_threshold', '150')
ON CONFLICT (setting_key) DO NOTHING;

-- Create index for boosted listings queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_boosted 
ON public.marketplace_listings (is_boosted, boost_ends_at) 
WHERE is_boosted = true;

-- Create index for featured listings
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_featured 
ON public.marketplace_listings (is_featured, created_at DESC) 
WHERE status = 'active';