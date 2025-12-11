-- Create table to track AI generations
CREATE TABLE public.ai_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_type TEXT NOT NULL, -- 'text-to-image', 'text-to-video', 'image-to-text', 'video-to-text'
  prompt TEXT,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own generations"
ON public.ai_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
ON public.ai_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add AI settings to app_settings if not exists
INSERT INTO public.app_settings (key, value)
VALUES 
  ('ai_video_credit_cost', '10'),
  ('ai_free_image_limit', '3')
ON CONFLICT (key) DO NOTHING;