-- Create chess_rooms table for multiplayer chess
CREATE TABLE IF NOT EXISTS public.chess_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  guest_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting',
  game_state JSONB,
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chess_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view rooms
CREATE POLICY "Anyone can view chess rooms" 
ON public.chess_rooms 
FOR SELECT 
USING (true);

-- Allow authenticated users to create rooms
CREATE POLICY "Authenticated users can create rooms" 
ON public.chess_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = host_id);

-- Allow host or guest to update rooms
CREATE POLICY "Host or guest can update rooms" 
ON public.chess_rooms 
FOR UPDATE 
USING (auth.uid() = host_id OR auth.uid() = guest_id);

-- Allow host to delete rooms
CREATE POLICY "Host can delete rooms" 
ON public.chess_rooms 
FOR DELETE 
USING (auth.uid() = host_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_rooms;