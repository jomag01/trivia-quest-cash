-- AI Response Cache for 100M+ user scalability
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_hash TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  response_type TEXT NOT NULL,
  response_url TEXT,
  response_text TEXT,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_cache_prompt_hash ON public.ai_response_cache(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON public.ai_response_cache(expires_at);

-- Enable RLS
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for cache (performance)
CREATE POLICY "Public read cache" ON public.ai_response_cache
FOR SELECT USING (true);

-- Service role only for inserts/updates
CREATE POLICY "Service insert cache" ON public.ai_response_cache
FOR INSERT WITH CHECK (true);

CREATE POLICY "Service update cache" ON public.ai_response_cache
FOR UPDATE USING (true);

-- Request queue for rate limiting
CREATE TABLE IF NOT EXISTS public.ai_request_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  request_type TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ai_queue_status ON public.ai_request_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_queue_user ON public.ai_request_queue(user_id, created_at);

ALTER TABLE public.ai_request_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue" ON public.ai_request_queue
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert queue" ON public.ai_request_queue
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_ai_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ai_response_cache WHERE expires_at < now();
  DELETE FROM ai_request_queue WHERE created_at < now() - interval '1 hour' AND status IN ('completed', 'failed');
END;
$$;