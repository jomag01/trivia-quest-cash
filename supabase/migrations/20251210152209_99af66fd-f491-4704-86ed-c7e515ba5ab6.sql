-- Create story_reactions table for heart/like reactions on stories
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'heart',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_comments table for comments on stories
CREATE TABLE IF NOT EXISTS public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story_shares table for tracking shares
CREATE TABLE IF NOT EXISTS public.story_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add reaction counts to stories
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS reactions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_reactions
CREATE POLICY "Anyone can view story reactions"
ON public.story_reactions FOR SELECT USING (true);

CREATE POLICY "Users can add reactions"
ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for story_comments
CREATE POLICY "Anyone can view story comments"
ON public.story_comments FOR SELECT USING (true);

CREATE POLICY "Users can add comments"
ON public.story_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.story_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for story_shares
CREATE POLICY "Anyone can view story shares"
ON public.story_shares FOR SELECT USING (true);

CREATE POLICY "Users can add shares"
ON public.story_shares FOR INSERT WITH CHECK (auth.uid() = user_id);