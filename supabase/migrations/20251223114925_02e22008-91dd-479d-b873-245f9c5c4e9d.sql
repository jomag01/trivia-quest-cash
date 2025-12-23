-- Add country field to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'PH';

-- Add currency field to supplier_products table
ALTER TABLE public.supplier_products 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PHP';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_country ON public.suppliers(country);
CREATE INDEX IF NOT EXISTS idx_supplier_products_currency ON public.supplier_products(currency);