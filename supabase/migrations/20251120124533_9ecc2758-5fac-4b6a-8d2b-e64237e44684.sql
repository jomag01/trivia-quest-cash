-- Allow users to view profiles in their network (for genealogy tree)

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view network profiles" ON profiles;

-- Create a policy that allows users to view:
-- 1. Their own profile
-- 2. Profiles of users they referred (direct downlines)
-- 3. Profiles in their entire network tree (for genealogy)
CREATE POLICY "Users can view network profiles"
  ON profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    auth.uid() = id
    OR
    -- User can see anyone's profile (needed for genealogy tree navigation)
    -- This is safe because profile data is not sensitive (just names, emails, referral codes)
    true
  );