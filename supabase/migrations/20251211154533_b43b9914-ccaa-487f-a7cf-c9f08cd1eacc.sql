-- Enable RLS on ai_provider_pricing (admin only for write, read is public)
ALTER TABLE public.ai_provider_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view provider pricing"
  ON public.ai_provider_pricing FOR SELECT
  USING (true);

-- Enable RLS on ai_video_pricing (admin only for write, read is public)
ALTER TABLE public.ai_video_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view video pricing"
  ON public.ai_video_pricing FOR SELECT
  USING (true);