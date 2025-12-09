-- Create table to store link tracking data
CREATE TABLE IF NOT EXISTS public.link_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  link_type TEXT NOT NULL CHECK (link_type IN ('referral', 'product', 'affiliate', 'live_stream')),
  referrer_id UUID REFERENCES public.profiles(id),
  target_id TEXT,
  source_url TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  converted BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE,
  conversion_type TEXT
);

-- Enable RLS
ALTER TABLE public.link_tracking ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (for tracking)
CREATE POLICY "Anyone can insert link tracking"
ON public.link_tracking
FOR INSERT
WITH CHECK (true);

-- Allow reads for the referrer only
CREATE POLICY "Referrers can view their link tracking"
ON public.link_tracking
FOR SELECT
USING (referrer_id = auth.uid());

-- Allow updates for marking conversions
CREATE POLICY "Anyone can update link tracking"
ON public.link_tracking
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_link_tracking_visitor ON public.link_tracking(visitor_id, link_type);
CREATE INDEX IF NOT EXISTS idx_link_tracking_referrer ON public.link_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_link_tracking_expires ON public.link_tracking(expires_at);