-- Create cookie placement settings table
CREATE TABLE IF NOT EXISTS public.cookie_placement_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement_name TEXT NOT NULL,
    placement_key TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    cookie_name TEXT NOT NULL,
    cookie_duration_days INTEGER DEFAULT 90,
    tracking_pages TEXT[] DEFAULT '{}',
    capture_on TEXT[] DEFAULT '{}', -- 'page_load', 'scroll_50', 'scroll_100', 'click', 'purchase'
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cookie_placement_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read cookie_placement_settings" 
ON public.cookie_placement_settings FOR SELECT 
USING (true);

-- Only admin can modify
CREATE POLICY "Admin can manage cookie_placement_settings" 
ON public.cookie_placement_settings FOR ALL 
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default placements
INSERT INTO public.cookie_placement_settings (placement_name, placement_key, description, cookie_name, tracking_pages, capture_on, priority)
VALUES 
    ('Global Referral Tracking', 'global_referral', 'Captures referral codes from any page URL', 'aff_referral_referrer', ARRAY['/*'], ARRAY['page_load'], 100),
    ('Affiliate Link Tracking', 'affiliate_link', 'Tracks affiliate parameter in URLs', 'aff_affiliate_referrer', ARRAY['/*'], ARRAY['page_load'], 90),
    ('Product Page Referral', 'product_referral', 'Captures referrer on product pages', 'aff_product_referrer', ARRAY['/shop*', '/product*'], ARRAY['page_load'], 80),
    ('Checkout Attribution', 'checkout_attribution', 'Final attribution at checkout', 'aff_checkout_referrer', ARRAY['/checkout*', '/cart*'], ARRAY['page_load', 'purchase'], 70),
    ('Blog Referral Tracking', 'blog_referral', 'Captures referrer from blog links', 'aff_blog_referrer', ARRAY['/blog*', '/news*'], ARRAY['page_load', 'scroll_50'], 60),
    ('Service Booking Referral', 'service_referral', 'Tracks referrer for service bookings', 'aff_service_referrer', ARRAY['/booking*', '/services*'], ARRAY['page_load'], 50)
ON CONFLICT (placement_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_cookie_placement_settings_updated_at
    BEFORE UPDATE ON public.cookie_placement_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();