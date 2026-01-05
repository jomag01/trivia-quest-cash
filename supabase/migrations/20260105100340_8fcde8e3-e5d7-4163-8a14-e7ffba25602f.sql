-- Add variant_id, variant_name, and customer_notes to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Add customer_notes and referrer_code to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_notes TEXT,
ADD COLUMN IF NOT EXISTS referrer_code TEXT;

-- Create index for referrer_code for easy tracking
CREATE INDEX IF NOT EXISTS idx_orders_referrer_code ON public.orders(referrer_code);

-- Create index for variant_id lookups
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);