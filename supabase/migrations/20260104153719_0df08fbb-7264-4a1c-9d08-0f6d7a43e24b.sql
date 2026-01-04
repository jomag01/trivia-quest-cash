-- Add virtual try-on usage tracking table
CREATE TABLE IF NOT EXISTS public.virtual_tryon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  custom_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.virtual_tryon_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own virtual try-on usage"
ON public.virtual_tryon_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage
CREATE POLICY "Users can insert their own virtual try-on usage"
ON public.virtual_tryon_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Insert default app_settings for virtual try-on pricing
INSERT INTO public.app_settings (key, value) VALUES
  ('virtual_tryon_buyer_credits', '5'),
  ('virtual_tryon_seller_setup_credits', '20')
ON CONFLICT (key) DO NOTHING;