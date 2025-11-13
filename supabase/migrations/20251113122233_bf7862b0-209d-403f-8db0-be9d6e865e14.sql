-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.group_messages(id) ON DELETE CASCADE
);

-- Create message_reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Create message_attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create private_conversations table
CREATE TABLE IF NOT EXISTS public.private_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Create private_messages table
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.private_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES public.private_messages(id) ON DELETE CASCADE
);

-- Create video_call_sessions table
CREATE TABLE IF NOT EXISTS public.video_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.private_conversations(id) ON DELETE CASCADE,
  started_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  room_id TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_call_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups
CREATE POLICY "Anyone can view public groups"
  ON public.groups FOR SELECT
  USING (NOT is_private OR created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators and admins can update groups"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid() AND is_admin = true
  ));

CREATE POLICY "Group creators can delete groups"
  ON public.groups FOR DELETE
  USING (created_by = auth.uid());

-- RLS Policies for group_members
CREATE POLICY "Group members can view other members"
  ON public.group_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can join public groups"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    (EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND NOT is_private) OR
     EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_members.group_id AND user_id = auth.uid()))
  );

CREATE POLICY "Admins can manage members"
  ON public.group_members FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_members.group_id AND user_id = auth.uid() AND is_admin = true
  ) OR user_id = auth.uid());

-- RLS Policies for group_messages
CREATE POLICY "Group members can view messages"
  ON public.group_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid()
  ));

CREATE POLICY "Group members can send messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
  );

CREATE POLICY "Message senders and admins can delete messages"
  ON public.group_messages FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_messages.group_id AND user_id = auth.uid() AND is_admin = true
  ));

-- RLS Policies for message_reactions
CREATE POLICY "Anyone in group/conversation can view reactions"
  ON public.message_reactions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can add reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for message_attachments
CREATE POLICY "Group members can view attachments"
  ON public.message_attachments FOR SELECT
  USING (true);

CREATE POLICY "Group members can upload attachments"
  ON public.message_attachments FOR INSERT
  WITH CHECK (true);

-- RLS Policies for private_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.private_conversations FOR SELECT
  USING (auth.uid() IN (user1_id, user2_id));

CREATE POLICY "Users can create conversations"
  ON public.private_conversations FOR INSERT
  WITH CHECK (auth.uid() IN (user1_id, user2_id));

-- RLS Policies for private_messages
CREATE POLICY "Conversation participants can view messages"
  ON public.private_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.private_conversations 
    WHERE id = conversation_id AND auth.uid() IN (user1_id, user2_id)
  ));

CREATE POLICY "Conversation participants can send messages"
  ON public.private_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND 
    EXISTS (SELECT 1 FROM public.private_conversations WHERE id = conversation_id AND auth.uid() IN (user1_id, user2_id))
  );

CREATE POLICY "Message senders can update their messages"
  ON public.private_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- RLS Policies for video_call_sessions
CREATE POLICY "Group members can view call sessions"
  ON public.video_call_sessions FOR SELECT
  USING (
    started_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = video_call_sessions.group_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.private_conversations WHERE id = video_call_sessions.conversation_id AND auth.uid() IN (user1_id, user2_id))
  );

CREATE POLICY "Authenticated users can start calls"
  ON public.video_call_sessions FOR INSERT
  WITH CHECK (auth.uid() = started_by);

CREATE POLICY "Call starters can end calls"
  ON public.video_call_sessions FOR UPDATE
  USING (started_by = auth.uid());

-- Add realtime support
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;