-- Fix 1: file_uploads - Replace overly permissive SELECT policy with proper access control
DROP POLICY IF EXISTS "Anyone can view file uploads" ON public.file_uploads;

-- Users can view their own files
CREATE POLICY "Users can view own files"
ON public.file_uploads FOR SELECT 
USING (auth.uid() = user_id);

-- Public bucket files (without base64 data) are viewable by all authenticated users
CREATE POLICY "Public bucket files viewable by authenticated"
ON public.file_uploads FOR SELECT 
USING (
  bucket IN ('avatars', 'shop-images', 'product-images', 'ads', 'thumbnails', 'food-images', 'restaurant-images', 'menu-images', 'rider-documents', 'profile-images', 'post-images', 'story-images', 'group-images', 'chat-files', 'live-thumbnails')
  AND base64_data IS NULL
);

-- Admins can view all files
CREATE POLICY "Admins can view all files"
ON public.file_uploads FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: notifications - Add explicit INSERT policy for documentation/clarity
CREATE POLICY "System only can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (false);

COMMENT ON POLICY "System only can insert notifications" ON public.notifications IS 'Direct inserts denied. Use SECURITY DEFINER functions/triggers only.';