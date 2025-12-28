-- Add RLS policies for sellers to manage their own products

-- Allow authenticated users to insert products where they are the seller
CREATE POLICY "Sellers can insert their own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = seller_id);

-- Allow sellers to update their own products
CREATE POLICY "Sellers can update their own products"
ON public.products
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Allow sellers to view their own products (including inactive/pending)
CREATE POLICY "Sellers can view their own products"
ON public.products
FOR SELECT
TO authenticated
USING (auth.uid() = seller_id);