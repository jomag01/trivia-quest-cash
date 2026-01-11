-- Fix RLS policies for restaurant_tables to allow vendors to insert tables
DROP POLICY IF EXISTS "Vendors can manage their tables" ON public.restaurant_tables;

-- Create separate policies for INSERT, UPDATE, DELETE
CREATE POLICY "Vendors can insert their tables"
ON public.restaurant_tables
FOR INSERT
WITH CHECK (
  vendor_id IN (
    SELECT id FROM food_vendors WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update their tables"
ON public.restaurant_tables
FOR UPDATE
USING (
  vendor_id IN (
    SELECT id FROM food_vendors WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Vendors can delete their tables"
ON public.restaurant_tables
FOR DELETE
USING (
  vendor_id IN (
    SELECT id FROM food_vendors WHERE owner_id = auth.uid()
  )
);