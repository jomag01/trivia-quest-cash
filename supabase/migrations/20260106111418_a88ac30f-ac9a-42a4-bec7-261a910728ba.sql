-- Add default placement target and account hold status fields
ALTER TABLE public.binary_network 
  ADD COLUMN IF NOT EXISTS default_placement_user_id UUID REFERENCES public.binary_network(id),
  ADD COLUMN IF NOT EXISTS default_placement_username TEXT;

-- Add is_on_hold field to profiles for user-only accounts
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_on_hold BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_verified_user BOOLEAN DEFAULT false;

-- Update existing users who have purchased to not be on hold
UPDATE public.profiles p
SET is_on_hold = false, is_verified_user = true
WHERE EXISTS (
  SELECT 1 FROM public.binary_network bn 
  WHERE bn.user_id = p.id 
  AND (bn.admin_activated = true OR bn.has_deferred_payment = false)
)
OR EXISTS (
  SELECT 1 FROM public.ai_subscriptions sub 
  WHERE sub.user_id = p.id 
  AND sub.status = 'active'
)
OR p.is_paid_affiliate = true;

-- Mark admin users as not on hold
UPDATE public.profiles
SET is_on_hold = false, is_verified_user = true
WHERE is_admin = true;