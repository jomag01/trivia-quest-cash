-- Create table for ad spend requests (manual payments)
CREATE TABLE IF NOT EXISTS public.ad_spend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_title TEXT NOT NULL,
  ad_description TEXT,
  image_url TEXT,
  link_type TEXT DEFAULT 'custom',
  link_url TEXT,
  target_locations TEXT[],
  target_interests TEXT[],
  target_age_min INTEGER DEFAULT 18,
  target_age_max INTEGER DEFAULT 65,
  target_gender TEXT DEFAULT 'all',
  placement_id UUID,
  -- Custom budget fields
  budget_type TEXT NOT NULL DEFAULT 'tier', -- 'tier' or 'custom'
  pricing_tier_id UUID REFERENCES ad_pricing_tiers(id),
  custom_daily_budget NUMERIC(10,2),
  custom_duration_days INTEGER,
  total_budget NUMERIC(10,2) NOT NULL,
  -- Payment fields
  payment_method TEXT NOT NULL, -- 'diamonds', 'ewallet', 'bank'
  payment_reference TEXT,
  payment_proof_url TEXT,
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add custom budget fields to seller_custom_ads if not exists
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'tier';
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS custom_daily_budget NUMERIC(10,2);
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS custom_duration_days INTEGER;
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS total_budget NUMERIC(10,2);
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'diamonds';
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES ad_spend_requests(id);

-- Add admin ewallet/bank settings for ad payments
INSERT INTO public.ad_revenue_settings (setting_key, setting_value, description)
VALUES 
  ('ewallet_name', 'GCash', 'E-wallet provider name'),
  ('ewallet_number', '', 'E-wallet account number'),
  ('ewallet_holder', '', 'E-wallet account holder name'),
  ('bank_name', '', 'Bank name for transfers'),
  ('bank_account_number', '', 'Bank account number'),
  ('bank_account_holder', '', 'Bank account holder name'),
  ('qr_code_url', '', 'QR code image URL for payments'),
  ('custom_budget_enabled', 'true', 'Enable custom budget for ads'),
  ('min_daily_budget', '10', 'Minimum daily budget in diamonds'),
  ('max_daily_budget', '1000', 'Maximum daily budget in diamonds'),
  ('min_duration_days', '1', 'Minimum ad duration in days'),
  ('max_duration_days', '90', 'Maximum ad duration in days')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.ad_spend_requests ENABLE ROW LEVEL SECURITY;

-- Policies for ad_spend_requests
CREATE POLICY "Users can view their own ad spend requests"
ON public.ad_spend_requests FOR SELECT
USING (auth.uid() = seller_id);

CREATE POLICY "Users can create ad spend requests"
ON public.ad_spend_requests FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins can manage all ad spend requests"
ON public.ad_spend_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);