-- Create enum for product variant types
CREATE TYPE public.product_variant_type AS ENUM ('size', 'color', 'weight');

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL CHECK (base_price >= 0),
  commission_percentage DECIMAL(5, 2) NOT NULL DEFAULT 10.00 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create product images table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create product variants table
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  variant_type public.product_variant_type NOT NULL,
  variant_value TEXT NOT NULL,
  price_adjustment DECIMAL(10, 2) DEFAULT 0.00,
  stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
  sku TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, variant_type, variant_value)
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products (users can view active products, admins can manage)
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage all products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for product_images (users can view, admins can manage)
CREATE POLICY "Anyone can view product images"
ON public.product_images FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.is_active = true
));

CREATE POLICY "Admins can manage product images"
ON public.product_images FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for product_variants (users can view, admins can manage)
CREATE POLICY "Anyone can view product variants"
ON public.product_variants FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_variants.product_id 
  AND products.is_active = true
));

CREATE POLICY "Admins can manage product variants"
ON public.product_variants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_products_is_active ON public.products(is_active);
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();