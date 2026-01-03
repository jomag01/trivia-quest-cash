-- Allow text-only posts by making media_type nullable and updating the check constraint
ALTER TABLE public.posts ALTER COLUMN media_type DROP NOT NULL;

-- Drop and recreate the check constraint to allow NULL
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_media_type_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_media_type_check 
  CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'audio', 'live'));