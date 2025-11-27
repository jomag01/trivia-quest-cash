-- Create post_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'laugh', 'angry', 'sad')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reactions"
  ON public.post_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON public.post_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON public.post_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create post_shares table
CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view shares"
  ON public.post_shares FOR SELECT
  USING (true);

CREATE POLICY "Users can share posts"
  ON public.post_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add shares_count to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Function to update shares count
CREATE OR REPLACE FUNCTION public.update_post_shares_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET shares_count = shares_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET shares_count = shares_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger for shares count
DROP TRIGGER IF EXISTS update_shares_count_trigger ON public.post_shares;
CREATE TRIGGER update_shares_count_trigger
  AFTER INSERT OR DELETE ON public.post_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_shares_count();