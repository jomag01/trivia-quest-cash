-- Add new order statuses for returns and reshipments
-- Update orders table to support return/reship flow
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS commission_hold_until TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS return_requested_at TIMESTAMPTZ;

-- Add columns to seller_referrer_earnings for hold/release logic
ALTER TABLE public.seller_referrer_earnings ADD COLUMN IF NOT EXISTS hold_status TEXT DEFAULT 'released';
ALTER TABLE public.seller_referrer_earnings ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;
ALTER TABLE public.seller_referrer_earnings ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE public.seller_referrer_earnings ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;

-- Add columns to commissions table for hold logic
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS hold_status TEXT DEFAULT 'released';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS related_order_id UUID;
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'instant';
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS scheduled_payout_date DATE;

-- Create commission payout schedule settings
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('unilevel_payout_type', 'monthly'),
  ('unilevel_payout_day', '5'),
  ('stairstep_payout_type', 'monthly'),
  ('stairstep_payout_day', '5'),
  ('leadership_payout_type', 'monthly'),
  ('leadership_payout_day', '5'),
  ('binary_payout_type', 'weekly'),
  ('binary_payout_day', 'monday'),
  ('commission_hold_days', '15')
ON CONFLICT (key) DO NOTHING;

-- Add AI credits payment fields to seller_custom_ads
ALTER TABLE public.seller_custom_ads ADD COLUMN IF NOT EXISTS ai_credits_paid NUMERIC(12, 2) DEFAULT 0;

-- Add AI credits payment to ad_spend_requests  
ALTER TABLE public.ad_spend_requests ADD COLUMN IF NOT EXISTS ai_credits_paid NUMERIC(12, 2) DEFAULT 0;