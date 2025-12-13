-- Add research column to content_creator_projects if it doesn't exist
ALTER TABLE public.content_creator_projects 
ADD COLUMN IF NOT EXISTS research TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.content_creator_projects.research IS 'Stored research results from topic research step';