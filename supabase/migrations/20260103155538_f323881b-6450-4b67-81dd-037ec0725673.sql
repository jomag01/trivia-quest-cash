-- Create chat response ratings table to track seller performance
CREATE TABLE public.chat_response_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.provider_conversations(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to prevent multiple ratings per conversation
ALTER TABLE public.chat_response_ratings 
  ADD CONSTRAINT unique_conversation_rating UNIQUE (conversation_id, rater_id);

-- Enable RLS
ALTER TABLE public.chat_response_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own ratings" ON public.chat_response_ratings
  FOR SELECT USING (auth.uid() = rater_id OR auth.uid() = provider_id);

CREATE POLICY "Users can rate conversations" ON public.chat_response_ratings
  FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- Add chat_response_rating to profiles for aggregate tracking
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS chat_response_rating NUMERIC(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chat_response_count INTEGER DEFAULT 0;

-- Function to update provider's chat response rating
CREATE OR REPLACE FUNCTION public.update_chat_response_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    chat_response_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.chat_response_ratings
      WHERE provider_id = NEW.provider_id
    ),
    chat_response_count = (
      SELECT COUNT(*)
      FROM public.chat_response_ratings
      WHERE provider_id = NEW.provider_id
    )
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update rating
CREATE TRIGGER update_chat_response_rating_trigger
  AFTER INSERT OR UPDATE ON public.chat_response_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_response_rating();

-- Enable realtime for chat ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_response_ratings;