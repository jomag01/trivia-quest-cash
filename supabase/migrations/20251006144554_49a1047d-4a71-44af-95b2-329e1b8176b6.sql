-- Create product_images bucket using only id and name
INSERT INTO storage.buckets (id, name)
VALUES ('product_images', 'product_images')
ON CONFLICT (id) DO NOTHING;

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Public access product_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage product_images" ON storage.objects;

-- Public read access
CREATE POLICY "Public access product_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

-- Authenticated users can insert/update/delete
CREATE POLICY "Authenticated manage product_images"
ON storage.objects FOR ALL
USING (bucket_id = 'product_images' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'product_images' AND auth.role() = 'authenticated');