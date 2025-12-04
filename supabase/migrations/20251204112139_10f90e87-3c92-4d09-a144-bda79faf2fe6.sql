-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name)
VALUES ('profile-pictures', 'profile-pictures')
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile pictures bucket
CREATE POLICY "profile_pictures_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "profile_pictures_auth_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid() IS NOT NULL);

CREATE POLICY "profile_pictures_auth_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-pictures' AND auth.uid() IS NOT NULL);

CREATE POLICY "profile_pictures_auth_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-pictures' AND auth.uid() IS NOT NULL);