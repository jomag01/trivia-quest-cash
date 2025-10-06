-- Ensure storage buckets exist (without public column)
INSERT INTO storage.buckets (id, name)
VALUES 
  ('product_images', 'product_images'),
  ('receipts', 'receipts')
ON CONFLICT (id) DO NOTHING;

-- Clean up all previous conflicting policies
DROP POLICY IF EXISTS "Public access product_images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage product_images" ON storage.objects;
DROP POLICY IF EXISTS "Public access receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;

-- Product images: public read, authenticated write
CREATE POLICY "Public access product_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

CREATE POLICY "Authenticated manage product_images"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'product_images')
WITH CHECK (bucket_id = 'product_images');

-- Receipts: public read, authenticated write
CREATE POLICY "Public access receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated manage receipts"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'receipts')
WITH CHECK (bucket_id = 'receipts');