-- Fix storage bucket and create necessary buckets (without public column)
DO $$
BEGIN
  -- Drop existing policies first
  DROP POLICY IF EXISTS "Profile pictures are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
  DROP POLICY IF EXISTS "Post media is publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload post media" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own post media" ON storage.objects;
  DROP POLICY IF EXISTS "Ad images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload ad images" ON storage.objects;
END $$;

-- Create buckets
INSERT INTO storage.buckets (id, name)
VALUES ('profile-pictures', 'profile-pictures')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name)
VALUES ('post-media', 'post-media')
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name)
VALUES ('ads', 'ads')
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-pictures
CREATE POLICY "Profile pictures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for post-media
CREATE POLICY "Post media is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-media');

CREATE POLICY "Users can upload post media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own post media"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policies for ads
CREATE POLICY "Ad images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'ads');

CREATE POLICY "Admins can upload ad images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ads' AND 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create ads table for advertising system
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user behavior tracking tables for targeted advertising
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  interaction_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON public.user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_target ON public.user_interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created ON public.user_interactions(created_at DESC);

-- User preferences derived from interactions
CREATE TABLE IF NOT EXISTS public.user_ad_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  interest_tags JSONB DEFAULT '[]'::jsonb,
  viewed_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  purchase_history JSONB DEFAULT '[]'::jsonb,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ad_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ads
CREATE POLICY "Anyone can view active ads"
ON public.ads FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage ads"
ON public.ads FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for user_interactions
CREATE POLICY "Anyone can insert interactions"
ON public.user_interactions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own interactions"
ON public.user_interactions FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all interactions"
ON public.user_interactions FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for user_ad_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_ad_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.user_ad_preferences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert preferences"
ON public.user_ad_preferences FOR INSERT
WITH CHECK (true);