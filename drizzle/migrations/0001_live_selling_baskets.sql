ALTER TABLE public.live_stream_products ADD COLUMN IF NOT EXISTS basket_number integer;
ALTER TABLE public.live_stream_products ADD COLUMN IF NOT EXISTS pinned_at timestamptz;
ALTER TABLE public.live_stream_products REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_stream_products;