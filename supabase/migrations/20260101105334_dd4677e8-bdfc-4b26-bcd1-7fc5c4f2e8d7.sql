-- Add referrer_id, contact details, and listing fee columns to marketplace_listings
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS listing_fee_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS listing_fee_paid_at TIMESTAMPTZ;

-- Create marketplace settings table for admin-editable listing fee
CREATE TABLE IF NOT EXISTS public.marketplace_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on marketplace_settings
ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view marketplace settings"
ON public.marketplace_settings FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage marketplace settings"
ON public.marketplace_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Insert default listing fee
INSERT INTO public.marketplace_settings (setting_key, setting_value)
VALUES ('listing_fee', '50')
ON CONFLICT (setting_key) DO NOTHING;