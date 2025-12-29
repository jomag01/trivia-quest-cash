-- Add boosted sales and rating columns to products table for marketing purposes
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS boosted_sales_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS boosted_rating NUMERIC(2,1) DEFAULT 0 CHECK (boosted_rating >= 0 AND boosted_rating <= 5);

-- Add comment for documentation
COMMENT ON COLUMN public.products.boosted_sales_count IS 'Dummy/boosted sales count for display purposes to boost buyer confidence';
COMMENT ON COLUMN public.products.boosted_rating IS 'Boosted star rating (0-5) for display purposes';