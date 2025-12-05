-- RLS policies for rider-documents bucket (private)
CREATE POLICY "Users can upload their own rider documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rider-documents' AND (storage.foldername(name))[1] = 'riders' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Users can view their own rider documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'rider-documents' AND (storage.foldername(name))[1] = 'riders' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Admins can view all rider documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'rider-documents' AND EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND email IN (SELECT email FROM auth.users WHERE raw_user_meta_data->>'is_admin' = 'true')
));

-- RLS policies for food-images bucket (public read, authenticated write)
CREATE POLICY "Anyone can view food images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'food-images');

CREATE POLICY "Authenticated users can upload food images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

CREATE POLICY "Users can update their own food images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'food-images')
WITH CHECK (bucket_id = 'food-images');

CREATE POLICY "Users can delete their own food images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'food-images');