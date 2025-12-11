-- AI Provider Pricing Reference (for admin to track costs)
CREATE TABLE public.ai_provider_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  input_cost_per_1k DECIMAL(10, 6) DEFAULT 0,
  output_cost_per_1k DECIMAL(10, 6) DEFAULT 0,
  image_cost DECIMAL(10, 4) DEFAULT 0,
  video_cost_per_second DECIMAL(10, 4) DEFAULT 0,
  audio_cost_per_minute DECIMAL(10, 4) DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default AI provider pricing info
INSERT INTO public.ai_provider_pricing (provider_name, model_name, input_cost_per_1k, output_cost_per_1k, image_cost, video_cost_per_second, audio_cost_per_minute, notes) VALUES
('Google', 'gemini-2.5-flash', 0.000075, 0.0003, 0, 0, 0, 'Text input/output pricing'),
('Google', 'gemini-2.5-flash-image-preview', 0, 0, 0.02, 0, 0, 'Nano Banana - Image generation'),
('Google', 'gemini-2.5-pro', 0.00125, 0.005, 0, 0, 0, 'Higher quality text model'),
('ElevenLabs', 'eleven_multilingual_v2', 0, 0, 0, 0, 0.30, 'Voice synthesis - ~1000 chars = 1 min'),
('ElevenLabs', 'eleven_turbo_v2_5', 0, 0, 0, 0, 0.18, 'Faster voice synthesis'),
('OpenAI', 'gpt-5', 0.005, 0.015, 0, 0, 0, 'Premium text model'),
('OpenAI', 'gpt-5-mini', 0.00015, 0.0006, 0, 0, 0, 'Efficient text model'),
('Runway', 'gen-3-alpha', 0, 0, 0, 0.05, 0, 'Video generation ~$0.05/sec');

-- Video pricing tiers by duration
CREATE TABLE public.ai_video_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duration_seconds INTEGER NOT NULL,
  duration_label TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO public.ai_video_pricing (duration_seconds, duration_label, credit_cost) VALUES
(15, '15 seconds', 5),
(30, '30 seconds', 10),
(60, '1 minute', 18),
(180, '3 minutes', 50),
(300, '5 minutes', 80),
(600, '10 minutes', 150),
(900, '15 minutes', 220);

-- Content Creator Projects
CREATE TABLE public.content_creator_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  script TEXT,
  voice_id TEXT,
  voice_language TEXT DEFAULT 'en',
  audio_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT,
  music_url TEXT,
  status TEXT DEFAULT 'draft',
  target_duration_seconds INTEGER DEFAULT 60,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.content_creator_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON public.content_creator_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.content_creator_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.content_creator_projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.content_creator_projects FOR DELETE
  USING (auth.uid() = user_id);

-- Social Media Connections
CREATE TABLE public.social_media_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE public.social_media_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own connections"
  ON public.social_media_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Social Media Upload History
CREATE TABLE public.social_media_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.content_creator_projects(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  video_url TEXT,
  post_id TEXT,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.social_media_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own uploads"
  ON public.social_media_uploads FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);