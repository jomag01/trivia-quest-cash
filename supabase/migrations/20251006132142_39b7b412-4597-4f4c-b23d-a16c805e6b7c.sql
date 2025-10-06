-- Create storage bucket for shop item images
INSERT INTO storage.buckets (id, name) 
VALUES ('shop-items', 'shop-items')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for shop item images
CREATE POLICY "Shop item images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-items');

CREATE POLICY "Admins can upload shop item images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-items');

CREATE POLICY "Admins can update shop item images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shop-items');

CREATE POLICY "Admins can delete shop item images"
ON storage.objects FOR DELETE
USING (bucket_id = 'shop-items');