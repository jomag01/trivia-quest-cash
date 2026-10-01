ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'camera', ADD COLUMN IF NOT EXISTS playback_url text;
CREATE TABLE public.live_stream_ingest (
  stream_id uuid PRIMARY KEY REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel_arn text NOT NULL,
  ingest_server text NOT NULL,
  stream_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.live_stream_ingest TO authenticated;
GRANT ALL ON public.live_stream_ingest TO service_role;
ALTER TABLE public.live_stream_ingest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view own ingest" ON public.live_stream_ingest FOR SELECT TO authenticated USING (auth.uid() = user_id);