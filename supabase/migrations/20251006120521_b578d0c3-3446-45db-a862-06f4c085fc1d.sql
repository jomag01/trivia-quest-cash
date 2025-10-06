-- Create storage buckets
INSERT INTO storage.buckets (id, name)
VALUES 
  ('avatars', 'avatars'),
  ('shop-images', 'shop-images')
ON CONFLICT (id) DO NOTHING;

-- RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for shop-images bucket
CREATE POLICY "Shop images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'shop-images');

CREATE POLICY "Admins can upload shop images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'shop-images' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can update shop images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'shop-images' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete shop images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'shop-images' 
    AND public.has_role(auth.uid(), 'admin')
  );