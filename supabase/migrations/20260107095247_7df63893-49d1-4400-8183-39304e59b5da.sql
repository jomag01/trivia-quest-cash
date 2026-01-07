-- Create storage buckets for profile images and verification
INSERT INTO storage.buckets (id, name)
VALUES 
  ('profile-images', 'profile-images'),
  ('verification-images', 'verification-images'),
  ('beesmate-profiles', 'beesmate-profiles')
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own profile image" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own profile image" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own profile image" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own verification" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view their own verification" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can view all verifications" ON storage.objects;
  DROP POLICY IF EXISTS "Beesmate profiles are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload beesmate profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update beesmate profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete beesmate profile images" ON storage.objects;
END $$;

-- RLS policies for profile-images bucket (public read)
CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile image"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile image"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for verification-images bucket (private)
CREATE POLICY "Users can upload their own verification"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'verification-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own verification"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all verifications"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'verification-images' 
    AND public.has_role(auth.uid(), 'admin')
  );

-- RLS policies for beesmate-profiles bucket (public read)
CREATE POLICY "Beesmate profiles are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'beesmate-profiles');

CREATE POLICY "Users can upload beesmate profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'beesmate-profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update beesmate profile images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'beesmate-profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete beesmate profile images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'beesmate-profiles' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );