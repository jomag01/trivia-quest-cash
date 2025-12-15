-- Fix treasure_wallet UPDATE policy to prevent direct balance manipulation
-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "Users can update their own treasure wallet" ON public.treasure_wallet;

-- Create restrictive policy - block all direct updates
-- Balance modifications must go through database functions (SECURITY DEFINER)
CREATE POLICY "Block direct treasure wallet updates"
  ON public.treasure_wallet FOR UPDATE
  USING (false);