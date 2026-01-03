-- Create storage bucket for review media
INSERT INTO storage.buckets (id, name)
VALUES ('review-media', 'review-media')
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view review media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own review media" ON storage.objects;

-- RLS policies for review-media bucket
CREATE POLICY "Anyone can view review media"
ON storage.objects FOR SELECT
USING (bucket_id = 'review-media');

CREATE POLICY "Authenticated users can upload review media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own review media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'review-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);