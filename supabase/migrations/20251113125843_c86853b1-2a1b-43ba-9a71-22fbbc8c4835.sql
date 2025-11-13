-- Add foreign key constraint for private_conversations user1_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'private_conversations_user1_id_fkey' 
    AND table_name = 'private_conversations'
  ) THEN
    ALTER TABLE public.private_conversations
    ADD CONSTRAINT private_conversations_user1_id_fkey 
    FOREIGN KEY (user1_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for private_conversations user2_id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'private_conversations_user2_id_fkey' 
    AND table_name = 'private_conversations'
  ) THEN
    ALTER TABLE public.private_conversations
    ADD CONSTRAINT private_conversations_user2_id_fkey 
    FOREIGN KEY (user2_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key constraint for private_messages if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'private_messages_sender_id_fkey' 
    AND table_name = 'private_messages'
  ) THEN
    ALTER TABLE public.private_messages
    ADD CONSTRAINT private_messages_sender_id_fkey 
    FOREIGN KEY (sender_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;
  END IF;
END $$;