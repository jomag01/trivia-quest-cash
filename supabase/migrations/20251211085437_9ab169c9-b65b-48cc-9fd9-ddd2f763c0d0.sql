-- MOBA Game System Tables

-- Heroes table
CREATE TABLE public.moba_heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  role TEXT NOT NULL DEFAULT 'warrior', -- warrior, mage, assassin, tank, support
  base_hp INTEGER NOT NULL DEFAULT 100,
  base_attack INTEGER NOT NULL DEFAULT 10,
  base_defense INTEGER NOT NULL DEFAULT 5,
  base_speed DECIMAL NOT NULL DEFAULT 5,
  skill_1 JSONB DEFAULT '{}',
  skill_2 JSONB DEFAULT '{}',
  ultimate JSONB DEFAULT '{}',
  sprite_url TEXT,
  unlock_cost_diamonds INTEGER DEFAULT 0,
  is_starter BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Game levels table
CREATE TABLE public.moba_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'easy', -- tutorial, easy, medium, hard, boss, nightmare
  map_config JSONB DEFAULT '{}', -- map layout, obstacles, spawn points
  enemy_config JSONB DEFAULT '[]', -- enemy types, stats, spawn patterns
  boss_config JSONB, -- boss stats if boss level
  time_limit_seconds INTEGER DEFAULT 300,
  reward_diamonds INTEGER DEFAULT 1,
  reward_xp INTEGER DEFAULT 100,
  unlock_hero_id UUID REFERENCES public.moba_heroes(id),
  unlock_ability TEXT,
  story_chapter TEXT,
  story_cutscene JSONB,
  difficulty_multiplier DECIMAL DEFAULT 1.0,
  min_player_level INTEGER DEFAULT 1,
  entry_cost_diamonds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Player game progress
CREATE TABLE public.moba_player_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  current_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  player_level INTEGER DEFAULT 1,
  highest_level_completed INTEGER DEFAULT 0,
  total_games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_kills INTEGER DEFAULT 0,
  play_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Player unlocked heroes
CREATE TABLE public.moba_player_heroes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hero_id UUID NOT NULL REFERENCES public.moba_heroes(id) ON DELETE CASCADE,
  is_favorite BOOLEAN DEFAULT false,
  hero_xp INTEGER DEFAULT 0,
  hero_level INTEGER DEFAULT 1,
  skin_equipped TEXT DEFAULT 'default',
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, hero_id)
);

-- Level completion records
CREATE TABLE public.moba_level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_id UUID NOT NULL REFERENCES public.moba_levels(id) ON DELETE CASCADE,
  hero_used UUID REFERENCES public.moba_heroes(id),
  score INTEGER DEFAULT 0,
  time_seconds INTEGER,
  stars_earned INTEGER DEFAULT 0, -- 1-3 stars
  diamonds_earned INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- In-game store items
CREATE TABLE public.moba_store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL, -- energy_boost, skill_upgrade, armor, skin, hero
  effect_config JSONB DEFAULT '{}', -- what the item does
  price_diamonds INTEGER NOT NULL DEFAULT 10,
  duration_seconds INTEGER, -- null = permanent
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Player purchases
CREATE TABLE public.moba_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID REFERENCES public.moba_store_items(id),
  item_type TEXT NOT NULL,
  diamonds_spent INTEGER NOT NULL,
  referrer_id UUID, -- for affiliate tracking
  affiliate_commission_paid BOOLEAN DEFAULT false,
  purchased_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moba_heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moba_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moba_player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moba_player_heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moba_level_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moba_store_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moba_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for heroes (public read)
CREATE POLICY "Heroes are viewable by everyone" ON public.moba_heroes FOR SELECT USING (true);
CREATE POLICY "Only admins can manage heroes" ON public.moba_heroes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for levels (public read)
CREATE POLICY "Levels are viewable by everyone" ON public.moba_levels FOR SELECT USING (true);
CREATE POLICY "Only admins can manage levels" ON public.moba_levels FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for player progress
CREATE POLICY "Users can view own progress" ON public.moba_player_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.moba_player_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.moba_player_progress FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for player heroes
CREATE POLICY "Users can view own heroes" ON public.moba_player_heroes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own heroes" ON public.moba_player_heroes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own heroes" ON public.moba_player_heroes FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for level completions
CREATE POLICY "Users can view own completions" ON public.moba_level_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.moba_level_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for store items (public read)
CREATE POLICY "Store items are viewable by everyone" ON public.moba_store_items FOR SELECT USING (true);
CREATE POLICY "Only admins can manage store" ON public.moba_store_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for purchases
CREATE POLICY "Users can view own purchases" ON public.moba_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.moba_purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert starter heroes
INSERT INTO public.moba_heroes (name, slug, description, role, base_hp, base_attack, base_defense, base_speed, is_starter, skill_1, skill_2, ultimate) VALUES
('Knight', 'knight', 'A balanced warrior with sword and shield', 'warrior', 120, 12, 8, 4.5, true,
  '{"name": "Shield Bash", "damage": 15, "cooldown": 5, "range": 2}',
  '{"name": "Sword Slash", "damage": 25, "cooldown": 3, "range": 3}',
  '{"name": "Divine Shield", "effect": "invincible", "duration": 3, "cooldown": 30}'
),
('Mage', 'mage', 'Powerful spellcaster with ranged attacks', 'mage', 80, 18, 4, 5, true,
  '{"name": "Fireball", "damage": 30, "cooldown": 4, "range": 8}',
  '{"name": "Ice Nova", "damage": 20, "cooldown": 6, "range": 5, "effect": "slow"}',
  '{"name": "Meteor Storm", "damage": 50, "cooldown": 25, "range": 10}'
),
('Assassin', 'assassin', 'Fast and deadly melee fighter', 'assassin', 90, 20, 5, 7, true,
  '{"name": "Shadow Strike", "damage": 35, "cooldown": 6, "range": 4}',
  '{"name": "Vanish", "effect": "invisible", "duration": 3, "cooldown": 10}',
  '{"name": "Death Mark", "damage": 80, "cooldown": 30, "range": 2}'
);

-- Insert tutorial and first levels
INSERT INTO public.moba_levels (level_number, name, description, difficulty, time_limit_seconds, reward_diamonds, reward_xp, difficulty_multiplier, story_chapter, enemy_config, map_config) VALUES
(1, 'Training Grounds', 'Learn the basics of combat', 'tutorial', 600, 1, 50, 0.5,
  'Chapter 1: The Beginning - A new hero awakens...',
  '[{"type": "dummy", "hp": 30, "attack": 5, "count": 3}]',
  '{"width": 800, "height": 600, "spawn_x": 100, "spawn_y": 300}'
),
(2, 'Forest Path', 'Your first real battle against forest creatures', 'easy', 300, 2, 100, 1.0,
  'Chapter 2: Into the Wild - Venture into the mysterious forest.',
  '[{"type": "goblin", "hp": 50, "attack": 8, "count": 5}, {"type": "wolf", "hp": 40, "attack": 10, "count": 3}]',
  '{"width": 1000, "height": 800, "spawn_x": 100, "spawn_y": 400}'
),
(3, 'Goblin Camp', 'Raid the goblin camp and defeat their leader', 'easy', 300, 3, 150, 1.2,
  'Chapter 3: The Raid - Destroy the goblin menace.',
  '[{"type": "goblin", "hp": 60, "attack": 10, "count": 8}, {"type": "goblin_archer", "hp": 40, "attack": 15, "count": 4}]',
  '{"width": 1200, "height": 800, "spawn_x": 100, "spawn_y": 400}'
),
(4, 'Dark Cave', 'Navigate through the dangerous cave', 'medium', 360, 4, 200, 1.5,
  'Chapter 4: Darkness Within - Face your fears in the cave.',
  '[{"type": "bat", "hp": 30, "attack": 8, "count": 10}, {"type": "spider", "hp": 70, "attack": 12, "count": 5}]',
  '{"width": 1200, "height": 900, "spawn_x": 100, "spawn_y": 450}'
),
(5, 'Spider Queen Lair', 'Defeat the Spider Queen boss!', 'boss', 420, 10, 500, 2.0,
  'Chapter 5: The Queen - Face the terror of the cave.',
  '[{"type": "spider", "hp": 80, "attack": 15, "count": 6}]',
  '{"width": 1400, "height": 1000, "spawn_x": 100, "spawn_y": 500, "boss_spawn_x": 1200, "boss_spawn_y": 500}'
);

-- Update level 5 with boss config
UPDATE public.moba_levels SET boss_config = '{"name": "Spider Queen", "hp": 500, "attack": 25, "defense": 10, "abilities": ["web_trap", "poison_spray", "summon_spiders"]}' WHERE level_number = 5;

-- Insert store items
INSERT INTO public.moba_store_items (name, description, item_type, price_diamonds, duration_seconds, effect_config) VALUES
('Energy Boost', 'Restore 50% HP instantly', 'energy_boost', 5, null, '{"hp_restore_percent": 50}'),
('Attack Boost', '+25% attack for current level', 'skill_upgrade', 10, 300, '{"attack_multiplier": 1.25}'),
('Shield Boost', '+50% defense for current level', 'armor', 10, 300, '{"defense_multiplier": 1.5}'),
('Speed Boost', '+30% movement speed', 'skill_upgrade', 8, 300, '{"speed_multiplier": 1.3}'),
('Double XP', 'Earn double XP this level', 'skill_upgrade', 15, null, '{"xp_multiplier": 2}'),
('Extra Life', 'Revive once if defeated', 'energy_boost', 20, null, '{"extra_lives": 1}');

-- Function to calculate player level from XP
CREATE OR REPLACE FUNCTION calculate_player_level(total_xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(total_xp / 100))::INTEGER + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update player level
CREATE OR REPLACE FUNCTION update_player_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.player_level := calculate_player_level(NEW.total_xp);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_level
  BEFORE UPDATE ON public.moba_player_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_player_level();