-- Add affiliate exclusion flag to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS exclude_from_affiliate BOOLEAN DEFAULT FALSE;

-- Add table number to restaurant_reservations
ALTER TABLE public.restaurant_reservations 
ADD COLUMN IF NOT EXISTS table_number INTEGER;

-- Add table configuration columns to food_vendors for delivery geolocation
ALTER TABLE public.food_vendors 
ADD COLUMN IF NOT EXISTS delivers_to_all_areas BOOLEAN DEFAULT FALSE;

-- Create restaurant_tables table for individual table management
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seats INTEGER DEFAULT 4,
  description TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, table_number)
);

-- Enable RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Owners can manage their tables using owner_id column
CREATE POLICY "Vendors can manage their tables" ON public.restaurant_tables
  FOR ALL USING (
    vendor_id IN (SELECT id FROM public.food_vendors WHERE owner_id = auth.uid())
  );

-- Everyone can view tables
CREATE POLICY "Everyone can view tables" ON public.restaurant_tables
  FOR SELECT USING (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_vendor ON public.restaurant_tables(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_affiliate_excluded ON public.products(exclude_from_affiliate) WHERE exclude_from_affiliate = TRUE;