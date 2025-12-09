-- Add bulk purchase fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS bulk_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bulk_price numeric,
ADD COLUMN IF NOT EXISTS bulk_min_quantity integer DEFAULT 10;

-- Add bulk purchase fields to food_items table
ALTER TABLE public.food_items
ADD COLUMN IF NOT EXISTS bulk_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS bulk_price numeric,
ADD COLUMN IF NOT EXISTS bulk_min_quantity integer DEFAULT 10;

-- Add commission distribution settings to treasure_admin_settings
INSERT INTO public.treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  ('unilevel_commission_percent', '40', 'Percentage of referral diamonds distributed to 7-level network')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  ('stair_step_commission_percent', '35', 'Percentage of referral diamonds distributed to stair-step MLM')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO public.treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  ('leadership_commission_percent', '25', 'Percentage of referral diamonds distributed to leadership breakaway')
ON CONFLICT (setting_key) DO NOTHING;