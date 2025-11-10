-- Add game_type field to game_categories to support different game modes
ALTER TABLE public.game_categories 
ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'quiz' CHECK (game_type IN ('quiz', 'treasure-hunt'));

-- Update the table comment
COMMENT ON COLUMN public.game_categories.game_type IS 'Type of game: quiz for regular trivia game, treasure-hunt for treasure hunt game';

-- Insert a treasure hunt category
INSERT INTO public.game_categories (
  name, 
  slug, 
  icon, 
  description, 
  color_from, 
  color_to, 
  is_active, 
  min_level_required,
  game_type
) VALUES (
  'Treasure Hunt Adventure',
  'treasure-hunt',
  '🗺️',
  'Embark on an epic treasure hunt! Find hidden symbols across 15 challenging levels',
  'from-amber-500',
  'to-emerald-600',
  true,
  1,
  'treasure-hunt'
) ON CONFLICT (slug) DO UPDATE SET
  game_type = 'treasure-hunt',
  description = 'Embark on an epic treasure hunt! Find hidden symbols across 15 challenging levels',
  icon = '🗺️',
  name = 'Treasure Hunt Adventure';