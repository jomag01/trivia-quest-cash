-- ============================================
-- SECURITY FIX 3: Overly Permissive RLS Policies (continued)
-- Drop existing policies first, then create new ones
-- ============================================

-- Drop existing user view policies if they exist
DROP POLICY IF EXISTS "Users can view their own rank history" ON affiliate_rank_history;
DROP POLICY IF EXISTS "Users can view their own current rank" ON affiliate_current_rank;
DROP POLICY IF EXISTS "Users can view their own sales" ON affiliate_monthly_sales;

-- Create read-only policies for users (they can view their own data)
CREATE POLICY "Users can view their own rank history"
ON affiliate_rank_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own current rank"
ON affiliate_current_rank FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own sales"
ON affiliate_monthly_sales FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Drop and recreate treasure_wallet UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "Users can update their own treasure wallet" ON treasure_wallet;

-- No direct UPDATE policy - all updates must go through atomic functions

-- Fix treasure_admin_settings policy with proper WITH CHECK
DROP POLICY IF EXISTS "Only admins can modify settings" ON treasure_admin_settings;

CREATE POLICY "Only admins can modify settings"
ON treasure_admin_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));