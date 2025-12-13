-- Add image_url column to product_variants table for variant-specific images
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add hex_color column for color variants to store the actual color value
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS hex_color TEXT;

-- Comment explaining the columns
COMMENT ON COLUMN public.product_variants.image_url IS 'Image URL specific to this variant (e.g., different color image)';
COMMENT ON COLUMN public.product_variants.hex_color IS 'Hex color code for color variants (e.g., #FF0000 for red)';