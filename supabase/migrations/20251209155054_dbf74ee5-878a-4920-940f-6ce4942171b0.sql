-- Add category_type column to service_categories
ALTER TABLE public.service_categories
ADD COLUMN IF NOT EXISTS category_type TEXT DEFAULT 'standard';

-- Add custom columns to services table
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS destinations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS accommodations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS inclusions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS exclusions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS max_guests INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_guests INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS meeting_point TEXT DEFAULT NULL;