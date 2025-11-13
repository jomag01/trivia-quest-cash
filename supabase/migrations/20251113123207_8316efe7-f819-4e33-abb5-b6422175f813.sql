-- Drop existing problematic policies
DROP POLICY IF EXISTS "Group members can view other members" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can join public groups" ON public.group_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.group_members;

-- Create security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

-- Create security definer function to check if user is group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND is_admin = true
  )
$$;

-- Create security definer function to check if group is public
CREATE OR REPLACE FUNCTION public.is_public_group(_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.groups
    WHERE id = _group_id
      AND is_private = false
  )
$$;

-- New RLS Policies for group_members using security definer functions
CREATE POLICY "Users can view members of groups they belong to"
  ON public.group_members FOR SELECT
  USING (
    public.is_group_member(auth.uid(), group_id) OR
    public.is_public_group(group_id)
  );

CREATE POLICY "Users can join public groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    public.is_public_group(group_id)
  );

CREATE POLICY "Admins and creators can manage members"
  ON public.group_members FOR DELETE
  USING (
    public.is_group_admin(auth.uid(), group_id) OR
    user_id = auth.uid()
  );

CREATE POLICY "Admins and creators can update members"
  ON public.group_members FOR UPDATE
  USING (
    public.is_group_admin(auth.uid(), group_id)
  );