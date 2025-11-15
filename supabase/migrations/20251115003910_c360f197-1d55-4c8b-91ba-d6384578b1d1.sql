-- Add image_type column to product_images table
ALTER TABLE product_images 
ADD COLUMN image_type text DEFAULT 'gallery' 
CHECK (image_type IN ('static', 'hover', 'gallery'));

-- Add comment explaining the column
COMMENT ON COLUMN product_images.image_type IS 'Type of image: static (default display), hover (shown on hover), or gallery (additional images)';

-- Update existing images to be static if they are primary, otherwise gallery
UPDATE product_images 
SET image_type = CASE 
  WHEN is_primary = true THEN 'static'
  ELSE 'gallery'
END;