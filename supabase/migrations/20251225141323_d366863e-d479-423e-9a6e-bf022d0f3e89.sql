-- Add binary multi-account support
ALTER TABLE public.binary_network ADD COLUMN IF NOT EXISTS account_number INTEGER DEFAULT 1;
ALTER TABLE public.binary_network ADD COLUMN IF NOT EXISTS account_slot INTEGER DEFAULT 1;

-- Update the unique constraint to allow multiple accounts per user
ALTER TABLE public.binary_network DROP CONSTRAINT IF EXISTS binary_network_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS binary_network_user_account_idx ON public.binary_network (user_id, account_number);

-- Create table for binary-eligible shop products
CREATE TABLE IF NOT EXISTS public.binary_product_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  min_quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE public.binary_product_packages ENABLE ROW LEVEL SECURITY;

-- Policies for binary_product_packages
CREATE POLICY "Public can view active binary packages" 
ON public.binary_product_packages 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage binary packages"
ON public.binary_product_packages
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add setting for max binary accounts per user
INSERT INTO public.app_settings (key, value)
VALUES ('binary_max_accounts_per_user', '3')
ON CONFLICT (key) DO NOTHING;