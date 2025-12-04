-- Add streamer_id to live_stream_products to track who's sharing the product
ALTER TABLE public.live_stream_products 
ADD COLUMN IF NOT EXISTS streamer_id UUID REFERENCES auth.users(id);

-- Update existing records to use the stream's user_id as streamer_id
UPDATE public.live_stream_products lsp
SET streamer_id = ls.user_id
FROM public.live_streams ls
WHERE lsp.stream_id = ls.id AND lsp.streamer_id IS NULL;

-- Add live_stream_id to orders to track purchases from live streams
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS live_stream_id UUID REFERENCES public.live_streams(id),
ADD COLUMN IF NOT EXISTS live_streamer_id UUID REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_live_stream ON public.orders(live_stream_id);
CREATE INDEX IF NOT EXISTS idx_orders_live_streamer ON public.orders(live_streamer_id);