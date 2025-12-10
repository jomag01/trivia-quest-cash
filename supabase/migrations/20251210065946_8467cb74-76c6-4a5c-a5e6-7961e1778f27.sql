-- Create stories table for user stories
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  views_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Stories are visible to everyone
CREATE POLICY "Stories are viewable by everyone" 
ON public.stories 
FOR SELECT 
USING (expires_at > now());

-- Users can create their own stories
CREATE POLICY "Users can create their own stories" 
ON public.stories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete their own stories" 
ON public.stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create app_settings table for app configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- App settings are viewable by everyone
CREATE POLICY "App settings are viewable by everyone" 
ON public.app_settings 
FOR SELECT 
USING (true);

-- Only admins can modify app settings (via service role or RPC)
CREATE POLICY "Admins can manage app settings" 
ON public.app_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default logo setting
INSERT INTO public.app_settings (key, value) VALUES ('app_logo', null);

-- Create storage bucket for stories if not exists
INSERT INTO storage.buckets (id, name) VALUES ('stories', 'stories') ON CONFLICT DO NOTHING;

-- Storage policies for stories bucket
CREATE POLICY "Stories images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'stories');

CREATE POLICY "Users can upload their own story media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own story media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);