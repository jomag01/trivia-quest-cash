-- Create storage buckets (if they don't exist)
INSERT INTO storage.buckets (id, name)
VALUES 
  ('avatars', 'avatars'),
  ('shop-images', 'shop-images')
ON CONFLICT (id) DO NOTHING;