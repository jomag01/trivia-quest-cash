-- Create storage buckets only (no legacy columns)
INSERT INTO storage.buckets (id, name)
VALUES ('avatars', 'avatars'), ('shop-images', 'shop-images')
ON CONFLICT (id) DO NOTHING;