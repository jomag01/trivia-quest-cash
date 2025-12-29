-- Create guess_song_levels table with credits cost and diamond rewards
CREATE TABLE IF NOT EXISTS public.guess_song_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Very Easy', 'Easy', 'Medium', 'Hard', 'Very Hard', 'Expert', 'Legendary')),
  credits_to_play INTEGER NOT NULL DEFAULT 5,
  diamonds_reward INTEGER NOT NULL DEFAULT 10,
  sample_length_seconds INTEGER NOT NULL DEFAULT 8,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guess_song_levels ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active levels
CREATE POLICY "Anyone can view active song levels"
ON public.guess_song_levels
FOR SELECT
USING (is_active = true);

-- Create guess_song_progress table to track user progress
CREATE TABLE IF NOT EXISTS public.guess_song_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_number INTEGER NOT NULL,
  diamonds_earned INTEGER DEFAULT 0,
  credits_spent INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, level_number)
);

-- Enable RLS
ALTER TABLE public.guess_song_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for progress
CREATE POLICY "Users can view their own song progress"
ON public.guess_song_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own song progress"
ON public.guess_song_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own song progress"
ON public.guess_song_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Create guess_song_tracks table for admin to manage songs
CREATE TABLE IF NOT EXISTS public.guess_song_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 15),
  sample_start_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guess_song_tracks ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active tracks
CREATE POLICY "Anyone can view active song tracks"
ON public.guess_song_tracks
FOR SELECT
USING (is_active = true);

-- Insert the 15 levels with the specified configuration
INSERT INTO public.guess_song_levels (level_number, difficulty, credits_to_play, diamonds_reward, sample_length_seconds, notes)
VALUES
  (1, 'Very Easy', 5, 10, 8, 'Tutorial-friendly'),
  (2, 'Very Easy', 5, 12, 8, 'Popular songs'),
  (3, 'Easy', 6, 15, 7, NULL),
  (4, 'Easy', 6, 18, 7, NULL),
  (5, 'Medium', 7, 20, 6, 'Referral + Diamond Check'),
  (6, 'Medium', 7, 22, 6, NULL),
  (7, 'Medium', 8, 25, 6, NULL),
  (8, 'Hard', 8, 28, 5, NULL),
  (9, 'Hard', 9, 30, 5, NULL),
  (10, 'Hard', 9, 35, 5, NULL),
  (11, 'Very Hard', 10, 40, 4, NULL),
  (12, 'Very Hard', 10, 45, 4, NULL),
  (13, 'Expert', 11, 50, 4, NULL),
  (14, 'Expert', 12, 60, 3, NULL),
  (15, 'Legendary', 15, 80, 3, 'Final Level');

-- Insert the Guess Me the Song category into game_categories
INSERT INTO public.game_categories (name, slug, icon, description, color_from, color_to, game_type, entry_cost_diamonds)
VALUES (
  'Guess Me the Song!',
  'guess-song',
  '🎵',
  'Listen to song clips and guess the title. Earn diamonds as you progress through 15 exciting levels!',
  '#ec4899',
  '#8b5cf6',
  'quiz',
  5
)
ON CONFLICT (slug) DO NOTHING;