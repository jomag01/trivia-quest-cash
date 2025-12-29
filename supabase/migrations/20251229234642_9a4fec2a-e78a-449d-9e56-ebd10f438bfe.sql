-- Create table for purchase notification settings
CREATE TABLE public.purchase_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN DEFAULT true,
  show_interval_seconds INTEGER DEFAULT 15,
  pause_duration_seconds INTEGER DEFAULT 60,
  notifications_per_cycle INTEGER DEFAULT 5,
  show_fake_notifications BOOLEAN DEFAULT true,
  fake_product_names TEXT[] DEFAULT ARRAY['Premium Headphones', 'Wireless Earbuds', 'Smart Watch', 'Phone Case', 'Bluetooth Speaker'],
  fake_ai_packages TEXT[] DEFAULT ARRAY['AI Starter Pack', 'AI Pro Bundle', 'AI Credits Package', 'AI Premium Tier'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_notification_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings (public display)
CREATE POLICY "Anyone can read notification settings"
ON public.purchase_notification_settings
FOR SELECT
TO authenticated, anon
USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update notification settings"
ON public.purchase_notification_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notification settings"
ON public.purchase_notification_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.purchase_notification_settings (
  is_enabled, 
  show_interval_seconds, 
  pause_duration_seconds, 
  notifications_per_cycle,
  show_fake_notifications
) VALUES (true, 15, 60, 5, true);