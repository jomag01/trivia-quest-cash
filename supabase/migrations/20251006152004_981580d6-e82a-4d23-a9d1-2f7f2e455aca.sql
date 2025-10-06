-- Drop shop-related tables
DROP TABLE IF EXISTS public.product_variations CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.wishlist_items CASCADE;
DROP TABLE IF EXISTS public.shop_items CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Drop storage buckets for product images and receipts
DELETE FROM storage.buckets WHERE id IN ('product_images', 'receipts');