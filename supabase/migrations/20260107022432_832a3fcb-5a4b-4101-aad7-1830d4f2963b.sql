-- Chat Mate Finder: User Interests
CREATE TABLE public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_tag TEXT NOT NULL,
  weight INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, interest_tag)
);

-- Chat Mate Finder: User Personality Profiles
CREATE TABLE public.user_personality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  communication_style TEXT DEFAULT 'friendly', -- calm, energetic, analytical, friendly
  conversation_depth TEXT DEFAULT 'casual', -- casual, deep, both
  tone_preference TEXT DEFAULT 'friendly', -- friendly, professional, humorous
  ai_personality_vector JSONB DEFAULT '{}',
  looking_for TEXT[] DEFAULT '{}', -- chat, business, games, learning
  languages TEXT[] DEFAULT ARRAY['English'],
  is_visible BOOLEAN DEFAULT true,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Mate Finder: Matches
CREATE TABLE public.chat_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_score FLOAT DEFAULT 0,
  match_reason TEXT,
  icebreaker_message TEXT,
  status TEXT DEFAULT 'pending', -- pending, accepted, skipped, blocked
  user_a_action TEXT, -- liked, skipped
  user_b_action TEXT, -- liked, skipped
  room_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_a, user_b)
);

-- Chat Mate Finder: Chat Rooms
CREATE TABLE public.chatmate_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type TEXT DEFAULT 'private', -- private, group
  match_id UUID REFERENCES public.chat_matches(id) ON DELETE SET NULL,
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key for room_id in chat_matches
ALTER TABLE public.chat_matches ADD CONSTRAINT chat_matches_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES public.chatmate_rooms(id) ON DELETE SET NULL;

-- Chat Mate Finder: Messages
CREATE TABLE public.chatmate_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chatmate_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- text, image, voice, ai_icebreaker
  is_ai_generated BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Mate Finder: Reports
CREATE TABLE public.chatmate_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.chatmate_rooms(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  severity INT DEFAULT 1, -- 1-5
  status TEXT DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  auto_action TEXT, -- warn, mute, ban
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Mate Finder: AI Behavior Logs
CREATE TABLE public.chatmate_ai_behavior_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.chatmate_rooms(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL, -- spam, mlm_pitch, harassment, link_abuse
  confidence FLOAT DEFAULT 0,
  message_content TEXT,
  action_taken TEXT, -- none, warn, mute, ban
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add trust_score to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trust_score') THEN
    ALTER TABLE public.profiles ADD COLUMN trust_score INT DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_chat_enabled') THEN
    ALTER TABLE public.profiles ADD COLUMN is_chat_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatmate_ai_behavior_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: user_interests
CREATE POLICY "Users can view all interests" ON public.user_interests FOR SELECT USING (true);
CREATE POLICY "Users can manage own interests" ON public.user_interests FOR ALL USING (auth.uid() = user_id);

-- RLS Policies: user_personality_profiles
CREATE POLICY "Users can view visible profiles" ON public.user_personality_profiles FOR SELECT USING (is_visible = true OR auth.uid() = user_id);
CREATE POLICY "Users can manage own profile" ON public.user_personality_profiles FOR ALL USING (auth.uid() = user_id);

-- RLS Policies: chat_matches
CREATE POLICY "Users can view own matches" ON public.chat_matches FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Users can create matches" ON public.chat_matches FOR INSERT WITH CHECK (auth.uid() = user_a);
CREATE POLICY "Users can update own matches" ON public.chat_matches FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- RLS Policies: chatmate_rooms
CREATE POLICY "Participants can view rooms" ON public.chatmate_rooms FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can create rooms" ON public.chatmate_rooms FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

-- RLS Policies: chatmate_messages
CREATE POLICY "Participants can view messages" ON public.chatmate_messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.chatmate_rooms WHERE id = room_id AND auth.uid() = ANY(participant_ids)));
CREATE POLICY "Participants can send messages" ON public.chatmate_messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chatmate_rooms WHERE id = room_id AND auth.uid() = ANY(participant_ids)));

-- RLS Policies: chatmate_reports
CREATE POLICY "Users can create reports" ON public.chatmate_reports FOR INSERT WITH CHECK (auth.uid() = reporter_user_id);
CREATE POLICY "Users can view own reports" ON public.chatmate_reports FOR SELECT USING (auth.uid() = reporter_user_id);
CREATE POLICY "Admins can manage reports" ON public.chatmate_reports FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- RLS Policies: chatmate_ai_behavior_logs (admin only)
CREATE POLICY "Admins can view behavior logs" ON public.chatmate_ai_behavior_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatmate_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_matches;

-- Create indexes for performance
CREATE INDEX idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX idx_chat_matches_users ON public.chat_matches(user_a, user_b);
CREATE INDEX idx_chat_matches_status ON public.chat_matches(status);
CREATE INDEX idx_chatmate_messages_room ON public.chatmate_messages(room_id, created_at DESC);
CREATE INDEX idx_chatmate_rooms_participants ON public.chatmate_rooms USING GIN(participant_ids);
CREATE INDEX idx_personality_profiles_visible ON public.user_personality_profiles(is_visible, last_active_at DESC);