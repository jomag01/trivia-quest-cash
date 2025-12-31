-- Fix RLS: Add admin policy for delivery_riders
-- First check if profiles has is_admin column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their rider profile" ON public.delivery_riders;
DROP POLICY IF EXISTS "Vendors can view approved riders" ON public.delivery_riders;
DROP POLICY IF EXISTS "Users can update their rider profile" ON public.delivery_riders;

-- Create new comprehensive policies
-- Admins can view ALL riders
CREATE POLICY "Admins can view all riders" ON public.delivery_riders
FOR SELECT USING (public.is_admin(auth.uid()));

-- Users can view their own rider profile
CREATE POLICY "Users can view own rider profile" ON public.delivery_riders
FOR SELECT USING (user_id = auth.uid());

-- Vendors can view approved riders (for delivery assignment)
CREATE POLICY "Vendors view approved riders" ON public.delivery_riders
FOR SELECT USING (status = 'approved');

-- Users can insert their own application
-- (keeping existing policy, no change needed)

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own rider profile" ON public.delivery_riders
FOR UPDATE USING (user_id = auth.uid());

-- Admins can update any rider (for approval/rejection)
CREATE POLICY "Admins can update riders" ON public.delivery_riders
FOR UPDATE USING (public.is_admin(auth.uid()));

-- Enable realtime for delivery_riders
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_riders;