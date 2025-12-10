-- Add metadata column to stories table for text, emoji, and music overlays
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;