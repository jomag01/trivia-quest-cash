CREATE TABLE public.ivs_stage_keys (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key_arn text NOT NULL,
  private_jwk jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ivs_stage_keys TO service_role;
ALTER TABLE public.ivs_stage_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.live_stream_stages (
  stream_id uuid PRIMARY KEY REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  stage_arn text NOT NULL,
  events_url text NOT NULL,
  whip_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.live_stream_stages TO service_role;
ALTER TABLE public.live_stream_stages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.live_viewer_join(_stream_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE live_streams SET viewer_count = coalesce(viewer_count,0) + 1, total_views = coalesce(total_views,0) + 1
  WHERE id = _stream_id AND status = 'live';
$$;
CREATE OR REPLACE FUNCTION public.live_viewer_leave(_stream_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  UPDATE live_streams SET viewer_count = greatest(coalesce(viewer_count,0) - 1, 0) WHERE id = _stream_id AND status = 'live';
$$;
GRANT EXECUTE ON FUNCTION public.live_viewer_join(uuid), public.live_viewer_leave(uuid) TO anon, authenticated;