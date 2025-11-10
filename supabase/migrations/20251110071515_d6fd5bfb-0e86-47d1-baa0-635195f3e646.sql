-- Create treasure hunt levels configuration table
CREATE TABLE public.treasure_hunt_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE CHECK (level_number >= 1 AND level_number <= 15),
  name TEXT NOT NULL,
  description TEXT,
  required_symbols INTEGER NOT NULL DEFAULT 3,
  credit_reward DECIMAL(10,2) NOT NULL DEFAULT 0,
  map_image_url TEXT,
  difficulty_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  time_limit_seconds INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create treasure hunt player progress table
CREATE TABLE public.treasure_hunt_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 15),
  symbols_found INTEGER NOT NULL DEFAULT 0,
  total_credits_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create treasure hunt level completions table
CREATE TABLE public.treasure_hunt_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level_number INTEGER NOT NULL,
  symbols_found INTEGER NOT NULL,
  credits_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treasure_hunt_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_hunt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasure_hunt_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for treasure_hunt_levels (everyone can view active levels)
CREATE POLICY "Anyone can view active treasure hunt levels"
  ON public.treasure_hunt_levels
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage treasure hunt levels"
  ON public.treasure_hunt_levels
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for treasure_hunt_progress
CREATE POLICY "Users can view their own progress"
  ON public.treasure_hunt_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
  ON public.treasure_hunt_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
  ON public.treasure_hunt_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for treasure_hunt_completions
CREATE POLICY "Users can view their own completions"
  ON public.treasure_hunt_completions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.treasure_hunt_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_treasure_hunt_levels_level_number ON public.treasure_hunt_levels(level_number);
CREATE INDEX idx_treasure_hunt_progress_user_id ON public.treasure_hunt_progress(user_id);
CREATE INDEX idx_treasure_hunt_completions_user_id ON public.treasure_hunt_completions(user_id);
CREATE INDEX idx_treasure_hunt_completions_level ON public.treasure_hunt_completions(level_number);

-- Create trigger for updated_at
CREATE TRIGGER update_treasure_hunt_levels_updated_at
  BEFORE UPDATE ON public.treasure_hunt_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treasure_hunt_progress_updated_at
  BEFORE UPDATE ON public.treasure_hunt_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default 15 levels
INSERT INTO public.treasure_hunt_levels (level_number, name, description, required_symbols, credit_reward, difficulty_multiplier) VALUES
(1, 'Ancient Cave', 'Find the hidden symbols in the mysterious cave', 3, 10.00, 1.0),
(2, 'Desert Oasis', 'Decipher the symbols in the scorching desert', 3, 15.00, 1.1),
(3, 'Jungle Temple', 'Locate ancient symbols in the overgrown temple', 4, 20.00, 1.2),
(4, 'Mountain Peak', 'Search for symbols at the mountain summit', 4, 25.00, 1.3),
(5, 'Pirate Cove', 'Unlock the treasure with your crew (2 referrals required)', 4, 50.00, 1.5),
(6, 'Underwater Ruins', 'Dive deep to find the submerged symbols', 5, 35.00, 1.4),
(7, 'Haunted Mansion', 'Brave the spirits to find the hidden symbols', 5, 40.00, 1.5),
(8, 'Ice Fortress', 'Find symbols frozen in time', 5, 45.00, 1.6),
(9, 'Volcanic Island', 'Search through molten danger', 6, 50.00, 1.7),
(10, 'Crystal Cavern', 'Locate symbols among the crystals', 6, 60.00, 1.8),
(11, 'Sky Castle', 'Discover symbols in the clouds', 6, 70.00, 1.9),
(12, 'Dragon Lair', 'Find symbols guarded by the dragon', 7, 80.00, 2.0),
(13, 'Lost City', 'Uncover symbols in the forgotten civilization', 7, 90.00, 2.1),
(14, 'Time Portal', 'Decipher symbols across time', 8, 100.00, 2.2),
(15, 'Ultimate Treasure', 'The final challenge awaits', 8, 150.00, 2.5);