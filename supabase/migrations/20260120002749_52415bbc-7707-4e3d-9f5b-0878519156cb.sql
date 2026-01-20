-- Create shortened_links table for link shortener service
CREATE TABLE public.shortened_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shortened_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own links
CREATE POLICY "Users can view their own links"
ON public.shortened_links FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view links for redirect (read short_code and original_url)
CREATE POLICY "Anyone can read link for redirect"
ON public.shortened_links FOR SELECT
USING (true);

-- Users can create their own links
CREATE POLICY "Users can create their own links"
ON public.shortened_links FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own links
CREATE POLICY "Users can update their own links"
ON public.shortened_links FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own links
CREATE POLICY "Users can delete their own links"
ON public.shortened_links FOR DELETE
USING (auth.uid() = user_id);

-- Create index on short_code for fast lookups
CREATE INDEX idx_shortened_links_short_code ON public.shortened_links(short_code);

-- Create index on user_id for user queries
CREATE INDEX idx_shortened_links_user_id ON public.shortened_links(user_id);

-- Function to increment click count
CREATE OR REPLACE FUNCTION public.increment_link_clicks(p_short_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original_url TEXT;
BEGIN
  UPDATE public.shortened_links
  SET clicks = clicks + 1, updated_at = now()
  WHERE short_code = p_short_code
  RETURNING original_url INTO v_original_url;
  
  RETURN v_original_url;
END;
$$;