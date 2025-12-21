-- Add is_paid_affiliate column to profiles to track paid membership status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_paid_affiliate BOOLEAN DEFAULT FALSE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_paid_affiliate ON public.profiles(is_paid_affiliate);