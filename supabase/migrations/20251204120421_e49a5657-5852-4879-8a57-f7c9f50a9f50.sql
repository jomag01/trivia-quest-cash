-- Create live streams table for TikTok-style live streaming
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  stream_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('offline', 'live', 'ended')),
  viewer_count INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live stream products table (products showcased during live)
CREATE TABLE public.live_stream_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live stream followers table
CREATE TABLE public.live_stream_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  streamer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(streamer_id, follower_id)
);

-- Create live stream comments table
CREATE TABLE public.live_stream_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live stream gifts/donations table
CREATE TABLE public.live_stream_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_type TEXT NOT NULL,
  diamond_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add qualification_type column to stair_step_config
ALTER TABLE public.stair_step_config 
ADD COLUMN qualification_type TEXT NOT NULL DEFAULT 'combined' 
CHECK (qualification_type IN ('personal', 'group', 'combined'));

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_gifts ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_streams
CREATE POLICY "Anyone can view live streams" ON public.live_streams
FOR SELECT USING (true);

CREATE POLICY "Users can create their own streams" ON public.live_streams
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streams" ON public.live_streams
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streams" ON public.live_streams
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for live_stream_products
CREATE POLICY "Anyone can view stream products" ON public.live_stream_products
FOR SELECT USING (true);

CREATE POLICY "Stream owners can manage products" ON public.live_stream_products
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.live_streams WHERE id = stream_id AND user_id = auth.uid())
);

-- RLS policies for live_stream_followers
CREATE POLICY "Anyone can view followers" ON public.live_stream_followers
FOR SELECT USING (true);

CREATE POLICY "Users can follow/unfollow" ON public.live_stream_followers
FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.live_stream_followers
FOR DELETE USING (auth.uid() = follower_id);

-- RLS policies for live_stream_comments
CREATE POLICY "Anyone can view comments" ON public.live_stream_comments
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.live_stream_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for live_stream_gifts
CREATE POLICY "Anyone can view gifts" ON public.live_stream_gifts
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can send gifts" ON public.live_stream_gifts
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable realtime for live features
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_gifts;

-- Create indexes for performance
CREATE INDEX idx_live_streams_user_id ON public.live_streams(user_id);
CREATE INDEX idx_live_streams_status ON public.live_streams(status);
CREATE INDEX idx_live_stream_followers_streamer ON public.live_stream_followers(streamer_id);
CREATE INDEX idx_live_stream_comments_stream ON public.live_stream_comments(stream_id);