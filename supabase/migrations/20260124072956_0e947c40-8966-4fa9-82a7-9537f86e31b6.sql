-- Create table to link Printify products with local products
CREATE TABLE public.printify_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  printify_product_id TEXT NOT NULL,
  printify_shop_id INTEGER NOT NULL,
  blueprint_id INTEGER,
  print_provider_id INTEGER,
  printify_data JSONB,
  admin_markup_percentage NUMERIC DEFAULT 20,
  is_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(printify_product_id)
);

-- Create table for POD variant pricing
CREATE TABLE public.printify_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  printify_product_id UUID REFERENCES public.printify_products(id) ON DELETE CASCADE,
  variant_id INTEGER NOT NULL,
  variant_title TEXT,
  printify_cost INTEGER NOT NULL DEFAULT 0,
  seller_price INTEGER NOT NULL DEFAULT 0,
  admin_markup_percentage NUMERIC DEFAULT 20,
  final_price INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printify_variants ENABLE ROW LEVEL SECURITY;

-- Simple RLS - allow all authenticated users (seller check done in app)
CREATE POLICY "Authenticated users can manage POD products"
  ON public.printify_products FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage POD variants"
  ON public.printify_variants FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add is_pod flag to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_pod BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX idx_printify_products_product_id ON public.printify_products(product_id);
CREATE INDEX idx_printify_variants_printify_product_id ON public.printify_variants(printify_product_id);