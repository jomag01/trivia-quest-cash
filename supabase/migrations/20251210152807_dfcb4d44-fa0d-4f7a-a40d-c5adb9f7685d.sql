-- Create a custom file_uploads table to track uploaded files
-- This works around the broken storage.buckets schema
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  storage_url TEXT,
  base64_data TEXT, -- Fallback storage for when direct upload fails
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bucket, path)
);

-- Enable RLS
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Anyone can view file metadata
CREATE POLICY "Anyone can view file uploads"
ON public.file_uploads FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can upload files"
ON public.file_uploads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update own files
CREATE POLICY "Users can update own files"
ON public.file_uploads FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own files
CREATE POLICY "Users can delete own files"
ON public.file_uploads FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_file_uploads_bucket_path ON public.file_uploads(bucket, path);
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON public.file_uploads(user_id);