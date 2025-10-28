-- Create table to track completed categories/games per user
CREATE TABLE IF NOT EXISTS public.user_completed_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.game_categories(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_levels_completed INTEGER NOT NULL DEFAULT 15,
  
  UNIQUE(user_id, category_id)
);

-- Enable RLS
ALTER TABLE public.user_completed_categories ENABLE ROW LEVEL SECURITY;

-- Users can view their own completed categories
CREATE POLICY "Users can view their own completed categories"
ON public.user_completed_categories
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completed categories
CREATE POLICY "Users can insert their own completed categories"
ON public.user_completed_categories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_completed_categories_user_id 
ON public.user_completed_categories(user_id);

CREATE INDEX idx_user_completed_categories_category_id 
ON public.user_completed_categories(category_id);