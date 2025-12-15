-- Create user_ai_credits table for tracking AI allocations
CREATE TABLE IF NOT EXISTS public.user_ai_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  images_available INTEGER NOT NULL DEFAULT 0,
  video_minutes_available NUMERIC(10,2) NOT NULL DEFAULT 0,
  audio_minutes_available NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_credits INTEGER NOT NULL DEFAULT 0,
  images_used INTEGER NOT NULL DEFAULT 0,
  video_minutes_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  audio_minutes_used NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_ai_credits ENABLE ROW LEVEL SECURITY;

-- Policies for user_ai_credits
CREATE POLICY "Users can view their own AI credits"
ON public.user_ai_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI credits"
ON public.user_ai_credits
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert AI credits"
ON public.user_ai_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add audio_minutes column to ai_credit_tiers settings if needed (stored in app_settings)
-- We'll store: ai_credit_tier_X_audio_minutes

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_ai_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_user_ai_credits_timestamp
BEFORE UPDATE ON public.user_ai_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_user_ai_credits_updated_at();

-- Add status column to binary_ai_purchases if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'status') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'images_allocated') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN images_allocated INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'video_minutes_allocated') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN video_minutes_allocated NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'audio_minutes_allocated') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN audio_minutes_allocated NUMERIC(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'admin_notes') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN admin_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'approved_at') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'binary_ai_purchases' AND column_name = 'approved_by') THEN
    ALTER TABLE public.binary_ai_purchases ADD COLUMN approved_by UUID;
  END IF;
END $$;