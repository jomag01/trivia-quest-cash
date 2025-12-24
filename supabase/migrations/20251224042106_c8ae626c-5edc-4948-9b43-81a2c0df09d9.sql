-- Add location fields to services table
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS service_radius_km double precision DEFAULT 10;

-- Add service_radius to food_vendors
ALTER TABLE public.food_vendors
ADD COLUMN IF NOT EXISTS service_radius_km double precision DEFAULT 10;

-- Create index for faster location queries
CREATE INDEX IF NOT EXISTS idx_services_location ON public.services (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_food_vendors_location ON public.food_vendors (latitude, longitude);