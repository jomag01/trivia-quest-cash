-- Add latitude and longitude columns to marketplace_listings for geolocation
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for faster geo queries
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_geo 
ON public.marketplace_listings (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;