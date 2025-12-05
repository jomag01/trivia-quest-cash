
-- Create storage bucket for food images (without public column issue)
INSERT INTO storage.buckets (id, name) 
SELECT 'food-images', 'food-images' 
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'food-images');

-- Storage policies
CREATE POLICY "food_images_select" ON storage.objects FOR SELECT USING (bucket_id = 'food-images');
CREATE POLICY "food_images_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'food-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "food_images_update" ON storage.objects FOR UPDATE USING (bucket_id = 'food-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "food_images_delete" ON storage.objects FOR DELETE USING (bucket_id = 'food-images' AND auth.uid() IS NOT NULL);
