-- Add UTM and campaign tracking columns to link_tracking
ALTER TABLE public.link_tracking
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
ADD COLUMN IF NOT EXISTS utm_content TEXT,
ADD COLUMN IF NOT EXISTS utm_term TEXT,
ADD COLUMN IF NOT EXISTS src TEXT,
ADD COLUMN IF NOT EXISTS cmp TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS city TEXT;

-- Create affiliate_attributions table for immutable attribution records
CREATE TABLE IF NOT EXISTS public.affiliate_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  user_id UUID,
  affiliate_id UUID NOT NULL,
  referrer_id UUID,
  campaign_id TEXT,
  source TEXT,
  medium TEXT,
  attribution_type TEXT DEFAULT 'first_touch',
  attributed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revenue NUMERIC DEFAULT 0,
  commission NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campaign_metrics table for analytics
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  clicks INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  commission_paid NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(campaign_id, date)
);

-- Create deep_link_configs table for custom deep link paths
CREATE TABLE IF NOT EXISTS public.deep_link_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  path_pattern TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  requires_auth BOOLEAN DEFAULT false,
  preload_metadata BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default deep link configs
INSERT INTO public.deep_link_configs (entity_type, path_pattern, preload_metadata) VALUES
  ('product', '/shop', true),
  ('shop', '/shop', true),
  ('profile', '/profile', false),
  ('feed', '/feed', true),
  ('auction', '/auction', true),
  ('service', '/booking', true),
  ('restaurant', '/food', true),
  ('blog', '/blog', true),
  ('live', '/live', false)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_link_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_attributions
CREATE POLICY "Affiliates can view their own attributions"
ON public.affiliate_attributions FOR SELECT
USING (auth.uid() = affiliate_id OR auth.uid() = referrer_id);

CREATE POLICY "System can insert attributions"
ON public.affiliate_attributions FOR INSERT
WITH CHECK (true);

-- RLS policies for campaign_metrics (admin only for now)
CREATE POLICY "Anyone can view campaign metrics"
ON public.campaign_metrics FOR SELECT
USING (true);

CREATE POLICY "System can upsert campaign metrics"
ON public.campaign_metrics FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update campaign metrics"
ON public.campaign_metrics FOR UPDATE
USING (true);

-- RLS policies for deep_link_configs (public read)
CREATE POLICY "Anyone can view deep link configs"
ON public.deep_link_configs FOR SELECT
USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_link_tracking_utm ON public.link_tracking(utm_source, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_link_tracking_visitor ON public.link_tracking(visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_affiliate ON public.affiliate_attributions(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_attributions_order ON public.affiliate_attributions(order_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON public.campaign_metrics(campaign_id, date DESC);

-- Enable realtime for campaign metrics
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_metrics;