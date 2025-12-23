-- Create unified provider conversations table
CREATE TABLE public.provider_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('shop', 'marketplace', 'restaurant', 'service', 'booking')),
  reference_id UUID NULL, -- product_id, listing_id, vendor_id, service_id, etc.
  reference_title TEXT NULL, -- product name, listing title, etc.
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create provider messages table
CREATE TABLE public.provider_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.provider_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_messages ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can view their conversations" 
ON public.provider_conversations 
FOR SELECT 
USING (auth.uid() = customer_id OR auth.uid() = provider_id);

CREATE POLICY "Users can create conversations" 
ON public.provider_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their conversations" 
ON public.provider_conversations 
FOR UPDATE 
USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.provider_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.provider_conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.customer_id OR auth.uid() = c.provider_id)
  )
);

CREATE POLICY "Users can send messages in their conversations" 
ON public.provider_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.provider_conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.customer_id OR auth.uid() = c.provider_id)
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.provider_messages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.provider_conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.customer_id OR auth.uid() = c.provider_id)
  )
);

-- Create indexes
CREATE INDEX idx_provider_conversations_customer ON public.provider_conversations(customer_id);
CREATE INDEX idx_provider_conversations_provider ON public.provider_conversations(provider_id);
CREATE INDEX idx_provider_conversations_type ON public.provider_conversations(provider_type);
CREATE INDEX idx_provider_messages_conversation ON public.provider_messages(conversation_id);
CREATE INDEX idx_provider_messages_unread ON public.provider_messages(conversation_id, is_read) WHERE is_read = false;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_messages;

-- Create marketplace storage bucket
INSERT INTO storage.buckets (id, name)
VALUES ('marketplace', 'marketplace')
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for marketplace bucket
CREATE POLICY "Anyone can view marketplace images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'marketplace');

CREATE POLICY "Authenticated users can upload marketplace images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'marketplace' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own marketplace images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own marketplace images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'marketplace' AND auth.uid()::text = (storage.foldername(name))[1]);