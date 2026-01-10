-- Add is_blocked column to profiles table for admin blocking functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS blocked_by UUID,
ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Add total_tables column to food_vendors for restaurant table count
ALTER TABLE public.food_vendors 
ADD COLUMN IF NOT EXISTS total_tables INTEGER DEFAULT 0;

-- Add index for faster blocked user queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles(is_blocked) WHERE is_blocked = TRUE;