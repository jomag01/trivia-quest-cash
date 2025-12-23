-- Create promotional_ads table for admin-created promotional content
CREATE TABLE public.promotional_ads (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
    media_url text NOT NULL,
    thumbnail_url text,
    cta_text text DEFAULT 'Join Now',
    is_published boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.promotional_ads ENABLE ROW LEVEL SECURITY;

-- Published ads are viewable by all authenticated users
CREATE POLICY "Published promotional ads are viewable by authenticated users"
ON public.promotional_ads
FOR SELECT
TO authenticated
USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

-- Only admins can insert
CREATE POLICY "Admins can insert promotional ads"
ON public.promotional_ads
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update promotional ads"
ON public.promotional_ads
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete promotional ads"
ON public.promotional_ads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_promotional_ads_updated_at
    BEFORE UPDATE ON public.promotional_ads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();