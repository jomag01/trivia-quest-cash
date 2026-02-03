-- ============================================
-- SECURITY FIX: Overly Permissive RLS Policies & Storage Exposure
-- ============================================

-- =============================================
-- FIX 1: BLOG SYSTEM - Restrict to admin-only
-- =============================================

-- Drop existing overly permissive policies for blog_categories
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.blog_categories;

-- Create admin-only write policies for blog_categories
CREATE POLICY "Public can view categories"
ON public.blog_categories FOR SELECT
USING (true);

CREATE POLICY "Admins manage categories"
ON public.blog_categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update categories"
ON public.blog_categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete categories"
ON public.blog_categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies for blog_posts
DROP POLICY IF EXISTS "Authenticated users can manage posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view published posts" ON public.blog_posts;

-- Create admin-only write policies for blog_posts
CREATE POLICY "Public can view published posts"
ON public.blog_posts FOR SELECT
USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage posts"
ON public.blog_posts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update posts"
ON public.blog_posts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete posts"
ON public.blog_posts FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies for blog_tags
DROP POLICY IF EXISTS "Authenticated users can manage tags" ON public.blog_tags;
DROP POLICY IF EXISTS "Public can view tags" ON public.blog_tags;

-- Create admin-only write policies for blog_tags
CREATE POLICY "Public can view tags"
ON public.blog_tags FOR SELECT
USING (true);

CREATE POLICY "Admins manage tags"
ON public.blog_tags FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update tags"
ON public.blog_tags FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete tags"
ON public.blog_tags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies for blog_post_tags
DROP POLICY IF EXISTS "Authenticated users can manage post tags" ON public.blog_post_tags;
DROP POLICY IF EXISTS "Public can view post tags" ON public.blog_post_tags;

-- Create admin-only write policies for blog_post_tags
CREATE POLICY "Public can view post tags"
ON public.blog_post_tags FOR SELECT
USING (true);

CREATE POLICY "Admins manage post tags"
ON public.blog_post_tags FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update post tags"
ON public.blog_post_tags FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete post tags"
ON public.blog_post_tags FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing overly permissive policies for blog_comments
DROP POLICY IF EXISTS "Authenticated users can manage comments" ON public.blog_comments;
DROP POLICY IF EXISTS "Public can view comments" ON public.blog_comments;

-- Create proper policies for blog_comments (users can add their own, admins can manage all)
CREATE POLICY "Public can view approved comments"
ON public.blog_comments FOR SELECT
USING (true);

CREATE POLICY "Users can add own comments"
ON public.blog_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own or admins update all comments"
ON public.blog_comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own or admins delete all comments"
ON public.blog_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- =============================================
-- FIX 2: AFFILIATE SYSTEM - Block direct writes
-- =============================================

-- Drop existing overly permissive policies for affiliate_rank_history
DROP POLICY IF EXISTS "System can manage rank history" ON public.affiliate_rank_history;
DROP POLICY IF EXISTS "Users can view own rank history" ON public.affiliate_rank_history;

-- Create read-only policies (writes only via SECURITY DEFINER functions)
CREATE POLICY "Users view own rank history"
ON public.affiliate_rank_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No direct inserts to rank history"
ON public.affiliate_rank_history FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct updates to rank history"
ON public.affiliate_rank_history FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct deletes to rank history"
ON public.affiliate_rank_history FOR DELETE
TO authenticated
USING (false);

-- Drop existing overly permissive policies for affiliate_current_rank
DROP POLICY IF EXISTS "System can manage current rank" ON public.affiliate_current_rank;
DROP POLICY IF EXISTS "Users can view own current rank" ON public.affiliate_current_rank;

-- Create read-only policies (writes only via SECURITY DEFINER functions)
CREATE POLICY "Users view own current rank"
ON public.affiliate_current_rank FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No direct inserts to current rank"
ON public.affiliate_current_rank FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct updates to current rank"
ON public.affiliate_current_rank FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct deletes to current rank"
ON public.affiliate_current_rank FOR DELETE
TO authenticated
USING (false);

-- Drop existing overly permissive policies for affiliate_monthly_sales
DROP POLICY IF EXISTS "System can manage sales" ON public.affiliate_monthly_sales;
DROP POLICY IF EXISTS "Users can view own sales" ON public.affiliate_monthly_sales;

-- Create read-only policies (writes only via SECURITY DEFINER functions)
CREATE POLICY "Users view own monthly sales"
ON public.affiliate_monthly_sales FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "No direct inserts to monthly sales"
ON public.affiliate_monthly_sales FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct updates to monthly sales"
ON public.affiliate_monthly_sales FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No direct deletes to monthly sales"
ON public.affiliate_monthly_sales FOR DELETE
TO authenticated
USING (false);

-- =============================================
-- FIX 3: FOOD ORDER SYSTEM - Validate ownership
-- =============================================

-- Drop existing overly permissive policies for food_order_items
DROP POLICY IF EXISTS "Users can insert order items" ON public.food_order_items;
DROP POLICY IF EXISTS "Users can view order items" ON public.food_order_items;

-- Create ownership-validated policies
CREATE POLICY "Users view own order items"
ON public.food_order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.food_orders 
    WHERE id = food_order_items.order_id 
    AND (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users insert own order items"
ON public.food_order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.food_orders 
    WHERE id = order_id AND customer_id = auth.uid()
  )
);

-- Drop existing overly permissive policies for delivery_assignments
DROP POLICY IF EXISTS "Users can insert delivery assignments" ON public.delivery_assignments;
DROP POLICY IF EXISTS "Users can view delivery assignments" ON public.delivery_assignments;

-- Create ownership-validated policies (using rider_id, not driver_id)
CREATE POLICY "Vendors and riders view assignments"
ON public.delivery_assignments FOR SELECT
TO authenticated
USING (
  rider_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.food_vendors 
    WHERE id = delivery_assignments.vendor_id AND owner_id = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Vendors create delivery assignments"
ON public.delivery_assignments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.food_vendors 
    WHERE id = vendor_id AND owner_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- FIX 4: ORDER ITEMS - Validate ownership
-- =============================================

-- Drop existing overly permissive policies for order_items
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;

-- Create ownership-validated policies
CREATE POLICY "Users view own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_items.order_id 
    AND (user_id = auth.uid() OR seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users insert own order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id AND user_id = auth.uid()
  )
);

-- =============================================
-- FIX 5: STORAGE - Secure receipts bucket
-- =============================================

-- Remove public access to receipts
DROP POLICY IF EXISTS "Public access receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated manage receipts" ON storage.objects;

-- Owner-only read access for receipts (using folder structure user_id/filename)
CREATE POLICY "Users access own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only upload for receipts
CREATE POLICY "Users upload own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only update for receipts
CREATE POLICY "Users update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only delete for receipts
CREATE POLICY "Users delete own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin read access for receipts (for dispute resolution)
CREATE POLICY "Admins access all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND 
  public.has_role(auth.uid(), 'admin')
);

-- =============================================
-- FIX 6: STORAGE - Secure product_images bucket
-- =============================================

-- Drop existing overly permissive policy for product_images
DROP POLICY IF EXISTS "Authenticated manage product_images" ON storage.objects;

-- Keep public read for product images (e-commerce requirement)
-- Restrict write to sellers and admins only
CREATE POLICY "Sellers manage own product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product_images' AND
  (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Sellers update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product_images' AND
  (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Sellers delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product_images' AND
  (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
);