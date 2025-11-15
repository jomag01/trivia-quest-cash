-- Allow anonymous users to view active products
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products" 
ON products FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- Allow anonymous users to view product images for active products
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;
CREATE POLICY "Anyone can view product images" 
ON product_images FOR SELECT 
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.is_active = true
  )
);

-- Allow anonymous users to view product categories
DROP POLICY IF EXISTS "Anyone can view product categories" ON product_categories;
CREATE POLICY "Anyone can view product categories" 
ON product_categories FOR SELECT 
TO anon, authenticated
USING (is_active = true);