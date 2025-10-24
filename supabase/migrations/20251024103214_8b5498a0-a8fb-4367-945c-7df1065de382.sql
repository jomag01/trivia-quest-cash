-- Create game_categories table
CREATE TABLE IF NOT EXISTS public.game_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  description TEXT,
  color_from TEXT NOT NULL,
  color_to TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  min_level_required INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active categories
CREATE POLICY "Anyone can view active categories"
ON public.game_categories
FOR SELECT
USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.game_categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_game_categories_updated_at
BEFORE UPDATE ON public.game_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default game categories
INSERT INTO public.game_categories (name, slug, icon, description, color_from, color_to) VALUES
('General Knowledge', 'general', '🌍', 'Test your knowledge across various topics', '#3b82f6', '#8b5cf6'),
('Science & Nature', 'science', '🔬', 'Explore the wonders of science and nature', '#10b981', '#06b6d4'),
('History', 'history', '📜', 'Journey through time and historical events', '#f59e0b', '#f97316'),
('Sports', 'sports', '⚽', 'Challenge your sports knowledge', '#ef4444', '#f43f5e'),
('Entertainment', 'entertainment', '🎬', 'Movies, music, and pop culture', '#8b5cf6', '#d946ef'),
('Geography', 'geography', '🗺️', 'Test your knowledge of the world', '#06b6d4', '#0284c7')
ON CONFLICT (slug) DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_game_categories_slug ON public.game_categories(slug);
CREATE INDEX IF NOT EXISTS idx_game_categories_active ON public.game_categories(is_active);