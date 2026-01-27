-- Create white-label tiers table
CREATE TABLE public.whitelabel_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name text NOT NULL,
    tier_key text NOT NULL UNIQUE,
    description text,
    price_php numeric NOT NULL DEFAULT 0,
    billing_cycle text DEFAULT 'monthly',
    features jsonb DEFAULT '[]'::jsonb,
    included_systems text[] DEFAULT '{}',
    max_users integer,
    max_products integer,
    max_storage_gb integer,
    custom_domain boolean DEFAULT false,
    custom_branding boolean DEFAULT false,
    api_access boolean DEFAULT false,
    priority_support boolean DEFAULT false,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create white-label subscriptions table
CREATE TABLE public.whitelabel_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL,
    tier_id uuid REFERENCES public.whitelabel_tiers(id),
    client_name text NOT NULL,
    client_email text NOT NULL,
    company_name text,
    custom_domain text,
    status text DEFAULT 'pending',
    payment_method text,
    payment_reference text,
    amount_paid numeric DEFAULT 0,
    starts_at timestamptz,
    expires_at timestamptz,
    admin_notes text,
    approved_by uuid,
    approved_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create white-label feature settings
CREATE TABLE public.whitelabel_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key text NOT NULL UNIQUE,
    feature_name text NOT NULL,
    description text,
    category text DEFAULT 'general',
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whitelabel_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelabel_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelabel_features ENABLE ROW LEVEL SECURITY;

-- RLS policies for tiers (public read, admin write)
CREATE POLICY "Anyone can view active tiers" ON public.whitelabel_tiers
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tiers" ON public.whitelabel_tiers
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for subscriptions
CREATE POLICY "Admins can manage subscriptions" ON public.whitelabel_subscriptions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view own subscription" ON public.whitelabel_subscriptions
    FOR SELECT USING (client_id = auth.uid());

-- RLS policies for features
CREATE POLICY "Anyone can view features" ON public.whitelabel_features
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage features" ON public.whitelabel_features
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default tiers
INSERT INTO public.whitelabel_tiers (tier_name, tier_key, description, price_php, billing_cycle, max_users, max_products, max_storage_gb, custom_domain, custom_branding, api_access, priority_support, display_order, included_systems) VALUES
('Starter', 'starter', 'Perfect for small businesses getting started', 9999, 'monthly', 50, 100, 5, false, true, false, false, 1, ARRAY['marketplace', 'basic_analytics']),
('Professional', 'professional', 'For growing businesses with advanced needs', 24999, 'monthly', 200, 500, 25, true, true, true, false, 2, ARRAY['marketplace', 'analytics', 'affiliate', 'ads']),
('Enterprise', 'enterprise', 'Full-featured white-label solution', 49999, 'monthly', NULL, NULL, 100, true, true, true, true, 3, ARRAY['marketplace', 'analytics', 'affiliate', 'ads', 'ai_tools', 'auction', 'food_delivery']);

-- Insert default features
INSERT INTO public.whitelabel_features (feature_key, feature_name, description, category, display_order) VALUES
('marketplace', 'Marketplace', 'Multi-vendor marketplace system', 'core', 1),
('analytics', 'Advanced Analytics', 'Comprehensive analytics dashboard', 'core', 2),
('affiliate', 'Affiliate System', 'MLM and affiliate marketing tools', 'marketing', 3),
('ads', 'Advertising Platform', 'Sponsored products and ads', 'marketing', 4),
('ai_tools', 'AI Tools', 'AI-powered content generation', 'advanced', 5),
('auction', 'Auction System', 'Live bidding and auctions', 'advanced', 6),
('food_delivery', 'Food Delivery', 'Restaurant and food ordering', 'advanced', 7),
('basic_analytics', 'Basic Analytics', 'Simple sales reports', 'core', 8);

-- Update trigger
CREATE TRIGGER update_whitelabel_tiers_updated_at
    BEFORE UPDATE ON public.whitelabel_tiers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whitelabel_subscriptions_updated_at
    BEFORE UPDATE ON public.whitelabel_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();