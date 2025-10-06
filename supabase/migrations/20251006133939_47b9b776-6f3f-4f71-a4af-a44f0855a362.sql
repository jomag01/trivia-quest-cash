-- Create shop-items storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('shop-items', 'shop-items')
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Public can view shop item images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload shop item images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update shop item images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete shop item images" ON storage.objects;

-- Allow public to view images in shop-items bucket
CREATE POLICY "Public can view shop item images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'shop-items');

-- Allow admins to upload images
CREATE POLICY "Admins can upload shop item images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'shop-items' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update images
CREATE POLICY "Admins can update shop item images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'shop-items' AND
  public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete shop item images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'shop-items' AND
  public.has_role(auth.uid(), 'admin')
);

-- Create product_variations table
CREATE TABLE IF NOT EXISTS public.product_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_item_id UUID NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  size TEXT,
  weight TEXT,
  color TEXT,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for product_variations
DROP POLICY IF EXISTS "Everyone can view product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can insert product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can update product variations" ON public.product_variations;
DROP POLICY IF EXISTS "Admins can delete product variations" ON public.product_variations;

-- RLS Policies for product_variations
CREATE POLICY "Everyone can view product variations"
ON public.product_variations
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert product variations"
ON public.product_variations
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product variations"
ON public.product_variations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product variations"
ON public.product_variations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_variations_shop_item_id ON public.product_variations(shop_item_id);

-- Add trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_product_variations_updated_at ON public.product_variations;
CREATE TRIGGER update_product_variations_updated_at
BEFORE UPDATE ON public.product_variations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();