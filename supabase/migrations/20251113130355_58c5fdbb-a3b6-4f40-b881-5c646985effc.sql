-- Add pinned and read tracking fields to group_messages
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES auth.users(id);

-- Create message_read_receipts table
CREATE TABLE IF NOT EXISTS public.message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS on message_read_receipts
ALTER TABLE public.message_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_read_receipts
CREATE POLICY "Users can insert their own read receipts"
ON public.message_read_receipts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view read receipts for their group messages"
ON public.message_read_receipts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members gme ON gme.group_id = gm.group_id
    WHERE gm.id = message_read_receipts.message_id
    AND gme.user_id = auth.uid()
  )
);

-- Create muted_users table for moderation
CREATE TABLE IF NOT EXISTS public.muted_group_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_until timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS on muted_group_users
ALTER TABLE public.muted_group_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for muted_group_users
CREATE POLICY "Group members can view muted users"
ON public.muted_group_users FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = muted_group_users.group_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Group admins can manage muted users"
ON public.muted_group_users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = muted_group_users.group_id
    AND user_id = auth.uid()
    AND is_admin = true
  )
);