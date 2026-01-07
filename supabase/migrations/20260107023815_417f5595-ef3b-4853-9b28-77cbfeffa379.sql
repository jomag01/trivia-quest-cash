-- Add premium visibility and game matching tables

-- Premium visibility tiers for ChatMate
CREATE TABLE IF NOT EXISTS public.chatmate_premium_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'boost', 'pro')),
  boost_weight FLOAT NOT NULL DEFAULT 1.0,
  priority_matching BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Game-based matching rooms
CREATE TABLE IF NOT EXISTS public.chatmate_game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL CHECK (game_type IN ('trivia', 'quiz', 'word_game', 'puzzle')),
  title TEXT NOT NULL,
  max_players INT NOT NULL DEFAULT 4,
  current_players INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  host_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Game room participants
CREATE TABLE IF NOT EXISTS public.chatmate_game_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_room_id UUID NOT NULL REFERENCES chatmate_game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  score INT DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_room_id, user_id)
);

-- Business networking mode verification
CREATE TABLE IF NOT EXISTS public.chatmate_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT FALSE,
  company_name TEXT,
  job_title TEXT,
  industry TEXT,
  linkedin_url TEXT,
  pitch_template TEXT,
  business_mode_enabled BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- AI conversation coach logs
CREATE TABLE IF NOT EXISTS public.chatmate_coach_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  room_id UUID REFERENCES chatmate_rooms(id),
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('icebreaker', 'continue', 'topic_change', 'deepen')),
  suggestion_text TEXT NOT NULL,
  was_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatmate_premium_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_coach_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for premium visibility
CREATE POLICY "Users can view own premium status" ON public.chatmate_premium_visibility
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own premium status" ON public.chatmate_premium_visibility
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own premium status" ON public.chatmate_premium_visibility
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for game rooms
CREATE POLICY "Anyone can view active game rooms" ON public.chatmate_game_rooms
  FOR SELECT USING (status IN ('waiting', 'active'));
CREATE POLICY "Users can create game rooms" ON public.chatmate_game_rooms
  FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their game rooms" ON public.chatmate_game_rooms
  FOR UPDATE USING (auth.uid() = host_id);

-- RLS Policies for game participants
CREATE POLICY "Anyone can view game participants" ON public.chatmate_game_participants
  FOR SELECT USING (true);
CREATE POLICY "Users can join games" ON public.chatmate_game_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave games" ON public.chatmate_game_participants
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for business profiles
CREATE POLICY "Users can view verified business profiles" ON public.chatmate_business_profiles
  FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own business profile" ON public.chatmate_business_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business profile" ON public.chatmate_business_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for coach suggestions
CREATE POLICY "Users can view own coach suggestions" ON public.chatmate_coach_suggestions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert coach suggestions" ON public.chatmate_coach_suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own suggestions" ON public.chatmate_coach_suggestions
  FOR UPDATE USING (auth.uid() = user_id);

-- Enable realtime for game rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatmate_game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatmate_game_participants;