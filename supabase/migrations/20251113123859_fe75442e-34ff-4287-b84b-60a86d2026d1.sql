-- Fix the INSERT policy for group_members to allow group creators to add themselves
DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      -- Can join public groups
      public.is_public_group(group_id) OR
      -- Or the user is the creator of the group (to add themselves as admin)
      EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = group_id
        AND created_by = auth.uid()
      )
    )
  );