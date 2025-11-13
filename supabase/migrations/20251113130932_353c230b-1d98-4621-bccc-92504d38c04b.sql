-- Create message_edit_history table
CREATE TABLE IF NOT EXISTS public.message_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  previous_content text NOT NULL,
  edited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  edited_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on message_edit_history
ALTER TABLE public.message_edit_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_edit_history
CREATE POLICY "Users can view edit history for group messages"
ON public.message_edit_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_messages gm
    JOIN public.group_members gme ON gme.group_id = gm.group_id
    WHERE gm.id = message_edit_history.message_id
    AND gme.user_id = auth.uid()
  )
);

-- Add edited timestamp to group_messages
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS edited_at timestamptz;