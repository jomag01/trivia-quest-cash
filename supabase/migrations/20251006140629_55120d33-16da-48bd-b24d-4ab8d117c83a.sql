-- Create storage bucket for shop items (public by default)
INSERT INTO storage.buckets (id, name)
VALUES ('shop-items', 'shop-items')
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view shop item images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-items');

-- Allow authenticated users to upload shop item images
CREATE POLICY "Authenticated users can upload shop items"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-items' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update shop item images
CREATE POLICY "Authenticated users can update shop items"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'shop-items'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete shop item images
CREATE POLICY "Authenticated users can delete shop items"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-items'
  AND auth.role() = 'authenticated'
);