-- Create product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read active categories
CREATE POLICY "Anyone can view active product categories"
ON public.product_categories
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Only admins can manage product categories
CREATE POLICY "Admins can manage product categories"
ON public.product_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add category_id to products table
ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_products_category_id ON public.products(category_id);

-- Insert some default categories
INSERT INTO public.product_categories (name, description, icon, display_order) VALUES
  ('Electronics', 'Electronic devices and gadgets', '📱', 1),
  ('Fashion', 'Clothing and accessories', '👕', 2),
  ('Home & Living', 'Home decor and furniture', '🏠', 3),
  ('Sports & Outdoors', 'Sports equipment and outdoor gear', '⚽', 4),
  ('Beauty & Personal Care', 'Beauty products and personal care items', '💄', 5);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION update_product_categories_updated_at();