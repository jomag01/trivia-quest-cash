-- Create table to track game level completions with diamond rewards
CREATE TABLE IF NOT EXISTS public.game_level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category_id UUID NOT NULL REFERENCES public.game_categories(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  diamonds_earned INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, level_number)
);

-- Enable RLS
ALTER TABLE public.game_level_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_level_completions
CREATE POLICY "Users can view their own level completions"
  ON public.game_level_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level completions"
  ON public.game_level_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_game_level_completions_user_category 
  ON public.game_level_completions(user_id, category_id);

-- Create function to get user's referral count
CREATE OR REPLACE FUNCTION public.get_referral_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.referrals
  WHERE referrer_id = p_user_id
$$;

-- Create function to check if user can access level (requires 2 referrals after level 5)
CREATE OR REPLACE FUNCTION public.can_access_level(p_user_id UUID, p_level INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN p_level <= 5 THEN true
    ELSE (SELECT COUNT(*) >= 2 FROM public.referrals WHERE referrer_id = p_user_id)
  END
$$;