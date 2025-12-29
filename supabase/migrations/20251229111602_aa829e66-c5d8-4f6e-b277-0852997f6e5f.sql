-- Add AI features unlock column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_features_unlocked boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.ai_features_unlocked IS 'Admin can unlock AI features for users without requiring credit purchase';