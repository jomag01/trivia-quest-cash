-- =====================================================
-- ADVANCED E-COMMERCE ADS SYSTEM DATABASE SCHEMA
-- Modeled after Shopee/Lazada/Facebook Ads
-- =====================================================

-- MODULE 1: SPONSORED PRODUCTS
-- Table for product-level sponsorship campaigns
CREATE TABLE IF NOT EXISTS public.sponsored_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  product_id UUID NOT NULL,
  campaign_name TEXT NOT NULL,
  bid_amount NUMERIC NOT NULL DEFAULT 1.0,
  daily_budget NUMERIC NOT NULL DEFAULT 100,
  total_budget NUMERIC NOT NULL DEFAULT 1000,
  spent_amount NUMERIC NOT NULL DEFAULT 0,
  quality_score NUMERIC DEFAULT 5.0,
  relevance_score NUMERIC DEFAULT 5.0,
  conversion_rate NUMERIC DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  target_roas NUMERIC DEFAULT 3.0,
  optimization_goal TEXT DEFAULT 'sales',
  status TEXT DEFAULT 'pending',
  is_learning_phase BOOLEAN DEFAULT true,
  learning_phase_data JSONB DEFAULT '{"impressions": 0, "conversions": 0}',
  placements TEXT[] DEFAULT ARRAY['homepage', 'category', 'search'],
  frequency_cap INTEGER DEFAULT 5,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sponsored product placements tracking
CREATE TABLE IF NOT EXISTS public.sponsored_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement_key TEXT UNIQUE NOT NULL,
  placement_name TEXT NOT NULL,
  placement_type TEXT NOT NULL,
  max_ads INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  priority_weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default placements
INSERT INTO public.sponsored_placements (placement_key, placement_name, placement_type, max_ads) VALUES
  ('homepage_feed', 'Homepage Product Feed', 'product_grid', 8),
  ('category_top', 'Category Page Top', 'product_grid', 4),
  ('category_inline', 'Category Page Inline', 'product_grid', 6),
  ('search_results', 'Search Results', 'product_list', 5),
  ('product_similar', 'You May Also Like', 'product_carousel', 4),
  ('cart_recommendations', 'Cart Recommendations', 'product_carousel', 3),
  ('beesmate_homepage', 'BeesMate Homepage', 'banner_carousel', 4),
  ('ai_hub_tabs', 'AI Hub Services', 'inline_banner', 2),
  ('seller_slider', 'Seller Ads Slider', 'slider_banner', 5)
ON CONFLICT (placement_key) DO NOTHING;

-- MODULE 2: AI AUTO-GENERATED AD CREATIVES
CREATE TABLE IF NOT EXISTS public.ai_ad_creatives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  product_id UUID,
  creative_type TEXT DEFAULT 'auto',
  headline TEXT NOT NULL,
  description TEXT,
  cta_text TEXT DEFAULT 'Shop Now',
  primary_image_url TEXT,
  secondary_images TEXT[],
  variation_key TEXT,
  is_active BOOLEAN DEFAULT true,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  performance_score NUMERIC DEFAULT 50,
  ab_test_group TEXT,
  is_control BOOLEAN DEFAULT false,
  auto_paused BOOLEAN DEFAULT false,
  pause_reason TEXT,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- A/B Test configurations
CREATE TABLE IF NOT EXISTS public.ad_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  control_creative_id UUID REFERENCES public.ai_ad_creatives(id),
  status TEXT DEFAULT 'running',
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ,
  winner_creative_id UUID REFERENCES public.ai_ad_creatives(id),
  confidence_level NUMERIC,
  statistical_significance BOOLEAN DEFAULT false,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MODULE 3: USER BEHAVIOR TRACKING FOR RETARGETING
CREATE TABLE IF NOT EXISTS public.user_behavior_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_id TEXT,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT,
  target_type TEXT,
  target_id TEXT,
  target_name TEXT,
  target_category TEXT,
  target_price NUMERIC,
  search_query TEXT,
  page_url TEXT,
  referrer_url TEXT,
  device_type TEXT,
  browser TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Retargeting audience segments
CREATE TABLE IF NOT EXISTS public.retargeting_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_name TEXT NOT NULL,
  segment_key TEXT UNIQUE NOT NULL,
  description TEXT,
  rules JSONB NOT NULL,
  lookback_days INTEGER DEFAULT 7,
  priority_boost NUMERIC DEFAULT 1.5,
  is_active BOOLEAN DEFAULT true,
  user_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default retargeting segments
INSERT INTO public.retargeting_segments (segment_name, segment_key, description, rules, lookback_days, priority_boost) VALUES
  ('Product Viewers', 'product_viewers', 'Users who viewed products but did not purchase', '{"events": ["product_view"], "exclude_events": ["purchase"]}', 7, 1.5),
  ('Cart Abandoners', 'cart_abandoners', 'Users who added to cart but did not checkout', '{"events": ["add_to_cart"], "exclude_events": ["purchase"]}', 3, 2.0),
  ('Checkout Abandoners', 'checkout_abandoners', 'Users who started checkout but did not complete', '{"events": ["checkout_start"], "exclude_events": ["purchase"]}', 1, 2.5),
  ('Category Browsers', 'category_browsers', 'Users who browsed specific categories', '{"events": ["category_view"]}', 14, 1.2),
  ('Search Intent', 'search_intent', 'Users who searched for products', '{"events": ["search"]}', 7, 1.3),
  ('Recent Purchasers', 'recent_purchasers', 'Users who made a purchase recently', '{"events": ["purchase"]}', 30, 1.1),
  ('AI Hub Users', 'ai_hub_users', 'Users who used AI Hub services', '{"events": ["ai_hub_search", "ai_generation"]}', 14, 1.4),
  ('BeesMate Clickers', 'beesmate_clickers', 'Users who engaged with BeesMate', '{"events": ["beesmate_click", "beesmate_view"]}', 7, 1.3)
ON CONFLICT (segment_key) DO NOTHING;

-- User retargeting profiles (aggregated user behavior)
CREATE TABLE IF NOT EXISTS public.user_retargeting_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_id TEXT,
  segments TEXT[],
  last_viewed_products TEXT[],
  last_viewed_categories TEXT[],
  last_search_queries TEXT[],
  cart_products TEXT[],
  purchase_history TEXT[],
  ai_hub_interactions TEXT[],
  beesmate_interactions TEXT[],
  total_product_views INTEGER DEFAULT 0,
  total_cart_adds INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  avg_order_value NUMERIC DEFAULT 0,
  purchase_probability NUMERIC DEFAULT 0.1,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(visitor_id)
);

-- MODULE 4: ROAS-BASED SMART BIDDING
CREATE TABLE IF NOT EXISTS public.smart_bidding_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value NUMERIC NOT NULL,
  action_type TEXT NOT NULL,
  action_value NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bid adjustment history
CREATE TABLE IF NOT EXISTS public.bid_adjustment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id) ON DELETE CASCADE,
  previous_bid NUMERIC NOT NULL,
  new_bid NUMERIC NOT NULL,
  adjustment_reason TEXT,
  performance_multiplier NUMERIC DEFAULT 1.0,
  roas_at_adjustment NUMERIC,
  rule_id UUID REFERENCES public.smart_bidding_rules(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MODULE 5: AD AUCTION ENGINE
CREATE TABLE IF NOT EXISTS public.ad_auction_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  placement_key TEXT NOT NULL,
  auction_timestamp TIMESTAMPTZ DEFAULT now(),
  user_id UUID,
  visitor_id TEXT,
  winning_ad_id UUID,
  winning_score NUMERIC,
  runner_up_ad_id UUID,
  runner_up_score NUMERIC,
  participating_ads INTEGER,
  auction_metadata JSONB DEFAULT '{}',
  latency_ms INTEGER
);

-- Ad impression tracking (detailed)
CREATE TABLE IF NOT EXISTS public.ad_impression_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id),
  creative_id UUID REFERENCES public.ai_ad_creatives(id),
  placement_key TEXT,
  user_id UUID,
  visitor_id TEXT,
  session_id TEXT,
  auction_id UUID REFERENCES public.ad_auction_logs(id),
  bid_amount NUMERIC,
  actual_cost NUMERIC,
  is_clicked BOOLEAN DEFAULT false,
  is_converted BOOLEAN DEFAULT false,
  conversion_value NUMERIC,
  retargeting_segment TEXT,
  retargeting_boost NUMERIC DEFAULT 1.0,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MODULE 7: FRAUD & QUALITY CONTROL
CREATE TABLE IF NOT EXISTS public.ad_fraud_detection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_id TEXT,
  ip_address TEXT,
  fraud_type TEXT NOT NULL,
  fraud_score NUMERIC NOT NULL,
  is_blocked BOOLEAN DEFAULT false,
  evidence JSONB DEFAULT '{}',
  detected_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  review_action TEXT
);

-- Impression caps per user
CREATE TABLE IF NOT EXISTS public.ad_impression_caps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_id TEXT,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id),
  impressions_today INTEGER DEFAULT 0,
  last_impression_at TIMESTAMPTZ DEFAULT now(),
  cap_reached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- MODULE 8: ANALYTICS AGGREGATES
CREATE TABLE IF NOT EXISTS public.ad_daily_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analytics_date DATE NOT NULL,
  seller_id UUID,
  sponsored_product_id UUID REFERENCES public.sponsored_products(id),
  product_id UUID,
  placement_key TEXT,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cvr NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpa NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform-level ad metrics (admin dashboard)
CREATE TABLE IF NOT EXISTS public.ad_platform_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metrics_date DATE NOT NULL UNIQUE,
  total_ad_revenue NUMERIC DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  active_advertisers INTEGER DEFAULT 0,
  avg_quality_score NUMERIC DEFAULT 0,
  fraud_blocked_count INTEGER DEFAULT 0,
  fraud_blocked_value NUMERIC DEFAULT 0,
  top_advertisers JSONB DEFAULT '[]',
  top_performing_ads JSONB DEFAULT '[]',
  system_health JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- MODULE 9: AD SETTINGS & CONFIGURATION
CREATE TABLE IF NOT EXISTS public.advanced_ad_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO public.advanced_ad_settings (setting_key, setting_value, setting_type, description) VALUES
  ('min_bid_amount', '0.1', 'number', 'Minimum bid amount per impression'),
  ('max_bid_amount', '100', 'number', 'Maximum bid amount per impression'),
  ('default_frequency_cap', '5', 'number', 'Default impressions per user per day'),
  ('learning_phase_impressions', '500', 'number', 'Impressions needed to exit learning phase'),
  ('auto_pause_low_roas_threshold', '0.5', 'number', 'ROAS below which ads are auto-paused'),
  ('fraud_click_threshold', '10', 'number', 'Clicks per minute to trigger fraud detection'),
  ('creative_refresh_days', '14', 'number', 'Days before suggesting creative refresh'),
  ('retargeting_max_days', '30', 'number', 'Maximum lookback for retargeting'),
  ('auction_timeout_ms', '100', 'number', 'Maximum time for ad auction in milliseconds'),
  ('platform_fee_percent', '15', 'number', 'Platform fee percentage on ad spend')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.sponsored_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsored_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_ad_creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_behavior_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retargeting_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_retargeting_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_bidding_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_adjustment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_auction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impression_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_fraud_detection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impression_caps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_daily_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_platform_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advanced_ad_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sponsored_products
CREATE POLICY "Sellers can view own sponsored products" ON public.sponsored_products FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can create sponsored products" ON public.sponsored_products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers can update own sponsored products" ON public.sponsored_products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Active products visible for serving" ON public.sponsored_products FOR SELECT USING (status = 'active');

-- RLS Policies for placements (public read)
CREATE POLICY "Anyone can view placements" ON public.sponsored_placements FOR SELECT USING (true);

-- RLS Policies for creatives
CREATE POLICY "Sellers can view own creatives" ON public.ai_ad_creatives FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Sellers can manage own creatives" ON public.ai_ad_creatives FOR ALL USING (auth.uid() = seller_id);

-- RLS for behavior events (insert only for tracking)
CREATE POLICY "Anyone can insert behavior events" ON public.user_behavior_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own events" ON public.user_behavior_events FOR SELECT USING (auth.uid() = user_id);

-- RLS for retargeting segments (public read)
CREATE POLICY "Anyone can view segments" ON public.retargeting_segments FOR SELECT USING (true);

-- RLS for user retargeting profiles
CREATE POLICY "Users can view own profile" ON public.user_retargeting_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage profiles" ON public.user_retargeting_profiles FOR ALL USING (true);

-- RLS for smart bidding rules
CREATE POLICY "Sellers can manage own bidding rules" ON public.smart_bidding_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sponsored_products sp WHERE sp.id = sponsored_product_id AND sp.seller_id = auth.uid())
);

-- RLS for bid adjustment history
CREATE POLICY "Sellers can view own bid history" ON public.bid_adjustment_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sponsored_products sp WHERE sp.id = sponsored_product_id AND sp.seller_id = auth.uid())
);

-- RLS for auction logs (public insert, restricted read)
CREATE POLICY "System can log auctions" ON public.ad_auction_logs FOR INSERT WITH CHECK (true);

-- RLS for impression details
CREATE POLICY "System can log impressions" ON public.ad_impression_details FOR INSERT WITH CHECK (true);
CREATE POLICY "Sellers can view own impressions" ON public.ad_impression_details FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sponsored_products sp WHERE sp.id = sponsored_product_id AND sp.seller_id = auth.uid())
);

-- RLS for fraud detection (admin only via service role)
CREATE POLICY "Fraud logs insert" ON public.ad_fraud_detection FOR INSERT WITH CHECK (true);

-- RLS for impression caps
CREATE POLICY "System can manage caps" ON public.ad_impression_caps FOR ALL USING (true);

-- RLS for daily analytics
CREATE POLICY "Sellers can view own analytics" ON public.ad_daily_analytics FOR SELECT USING (auth.uid() = seller_id);

-- RLS for platform metrics (admin only via service role)
CREATE POLICY "Public read metrics" ON public.ad_platform_metrics FOR SELECT USING (true);

-- RLS for settings (public read)
CREATE POLICY "Anyone can view settings" ON public.advanced_ad_settings FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sponsored_products_seller ON public.sponsored_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_products_status ON public.sponsored_products(status);
CREATE INDEX IF NOT EXISTS idx_sponsored_products_product ON public.sponsored_products(product_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_user ON public.user_behavior_events(user_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_visitor ON public.user_behavior_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_behavior_events_type ON public.user_behavior_events(event_type);
CREATE INDEX IF NOT EXISTS idx_behavior_events_created ON public.user_behavior_events(created_at);
CREATE INDEX IF NOT EXISTS idx_retargeting_profiles_user ON public.user_retargeting_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_profiles_visitor ON public.user_retargeting_profiles(visitor_id);
CREATE INDEX IF NOT EXISTS idx_impression_details_sponsored ON public.ad_impression_details(sponsored_product_id);
CREATE INDEX IF NOT EXISTS idx_impression_details_created ON public.ad_impression_details(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON public.ad_daily_analytics(analytics_date);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_seller ON public.ad_daily_analytics(seller_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsored_products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_daily_analytics;