-- =============================================
-- BEESMATE PREMIUM & ASPN REWARDS SYSTEM
-- =============================================

-- BeesMate Premium Tiers (admin-configurable)
CREATE TABLE public.beesmate_premium_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  tier_key TEXT NOT NULL UNIQUE,
  duration_days INTEGER NOT NULL DEFAULT 30,
  price_php DECIMAL(10,2) NOT NULL DEFAULT 0,
  visibility_multiplier INTEGER NOT NULL DEFAULT 1,
  daily_likes INTEGER DEFAULT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  ai_enhancement_mode TEXT NOT NULL DEFAULT 'credits', -- 'credits', 'unlimited', 'limited_free'
  ai_free_enhancements_per_month INTEGER DEFAULT 0,
  can_showcase_shop BOOLEAN DEFAULT false,
  can_join_rewards_program BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- BeesMate User Subscriptions
CREATE TABLE public.beesmate_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES public.beesmate_premium_tiers(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, cancelled
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- BeesMate Profile Images (multiple images support)
CREATE TABLE public.beesmate_profile_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_ai_enhanced BOOLEAN DEFAULT false,
  ai_enhancement_type TEXT, -- 'background', 'filter', 'beautify'
  original_image_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BeesMate Shop Showcase (for premium users)
CREATE TABLE public.beesmate_shop_showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID,
  shop_url TEXT,
  shop_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- BeesMate Referral Tracking (unified with main affiliate system)
CREATE TABLE public.beesmate_referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  this_month_earnings DECIMAL(12,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- BeesMate Activity Requirements (admin-configurable)
CREATE TABLE public.beesmate_activity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ASPN (Adaptive Sales Pool Network) TABLES
-- =============================================

-- ASPN Tiers (admin-configurable)
CREATE TABLE public.aspn_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  tier_key TEXT NOT NULL UNIQUE,
  price_php DECIMAL(10,2) NOT NULL DEFAULT 0,
  admin_profit_percent DECIMAL(5,2) NOT NULL DEFAULT 40,
  aspn_pool_percent DECIMAL(5,2) NOT NULL DEFAULT 30,
  sp_rate DECIMAL(8,4) NOT NULL DEFAULT 1.0, -- SP earned per peso
  lifetime_cap DECIMAL(12,2), -- NULL means no cap
  auto_deduct_enabled BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ASPN User Enrollment
CREATE TABLE public.aspn_user_enrollment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tier_id UUID REFERENCES public.aspn_tiers(id),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  is_graduated BOOLEAN DEFAULT false,
  graduated_at TIMESTAMPTZ,
  total_sp_earned DECIMAL(14,4) DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  lifetime_cap_reached BOOLEAN DEFAULT false,
  auto_deduct_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ASPN Sales Points Ledger
CREATE TABLE public.aspn_sp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_user_id UUID, -- who generated the SP
  source_type TEXT NOT NULL, -- 'subscription', 'ai_credits', 'shop', 'beesmate_premium'
  source_id UUID, -- reference to the transaction
  sp_amount DECIMAL(14,4) NOT NULL,
  level_from_source INTEGER DEFAULT 0, -- genealogy level
  decay_applied DECIMAL(5,4) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ASPN Earnings
CREATE TABLE public.aspn_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier_id UUID REFERENCES public.aspn_tiers(id),
  cycle_id UUID,
  amount DECIMAL(12,2) NOT NULL,
  sp_used DECIMAL(14,4) NOT NULL,
  pool_share_percent DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ASPN Pool Configuration
CREATE TABLE public.aspn_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_name TEXT NOT NULL,
  total_pool_amount DECIMAL(14,2) DEFAULT 0,
  distributed_amount DECIMAL(14,2) DEFAULT 0,
  remaining_amount DECIMAL(14,2) DEFAULT 0,
  cycle_start TIMESTAMPTZ,
  cycle_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ASPN Distribution Cycles
CREATE TABLE public.aspn_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.aspn_pools(id),
  cycle_number INTEGER NOT NULL,
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  total_sp_in_cycle DECIMAL(14,4) DEFAULT 0,
  total_distributed DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, processing, completed
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ASPN Admin Settings
CREATE TABLE public.aspn_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.beesmate_premium_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beesmate_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beesmate_profile_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beesmate_shop_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beesmate_referral_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beesmate_activity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_user_enrollment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_sp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aspn_settings ENABLE ROW LEVEL SECURITY;

-- Public read for tiers
CREATE POLICY "Anyone can view premium tiers" ON public.beesmate_premium_tiers FOR SELECT USING (true);
CREATE POLICY "Anyone can view aspn tiers" ON public.aspn_tiers FOR SELECT USING (true);

-- Users manage their own data
CREATE POLICY "Users manage own subscriptions" ON public.beesmate_subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own images" ON public.beesmate_profile_images FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own showcase" ON public.beesmate_shop_showcase FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own referral stats" ON public.beesmate_referral_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own aspn enrollment" ON public.aspn_user_enrollment FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own sp ledger" ON public.aspn_sp_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own aspn earnings" ON public.aspn_earnings FOR SELECT USING (auth.uid() = user_id);

-- Public read for pools/cycles (transparency)
CREATE POLICY "Anyone can view aspn pools" ON public.aspn_pools FOR SELECT USING (true);
CREATE POLICY "Anyone can view aspn cycles" ON public.aspn_cycles FOR SELECT USING (true);

-- Public read for settings
CREATE POLICY "Anyone can view beesmate settings" ON public.beesmate_activity_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can view aspn settings" ON public.aspn_settings FOR SELECT USING (true);

-- Admin policies using has_role function
CREATE POLICY "Admins manage premium tiers" ON public.beesmate_premium_tiers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage aspn tiers" ON public.aspn_tiers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage beesmate settings" ON public.beesmate_activity_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage aspn settings" ON public.aspn_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage aspn pools" ON public.aspn_pools FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage aspn cycles" ON public.aspn_cycles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all referral stats" ON public.beesmate_referral_stats FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update referral stats" ON public.beesmate_referral_stats FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert referral stats" ON public.beesmate_referral_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view all sp ledger" ON public.aspn_sp_ledger FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all aspn earnings" ON public.aspn_earnings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all subscriptions" ON public.beesmate_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins view all aspn enrollment" ON public.aspn_user_enrollment FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.aspn_sp_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.aspn_earnings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beesmate_subscriptions;

-- Insert default premium tiers
INSERT INTO public.beesmate_premium_tiers (tier_name, tier_key, duration_days, price_php, visibility_multiplier, daily_likes, features, ai_enhancement_mode, ai_free_enhancements_per_month, can_showcase_shop, can_join_rewards_program, display_order) VALUES
('Free', 'free', 0, 0, 1, 5, '["Basic profile", "Standard matching"]', 'credits', 0, false, false, 0),
('Boost', 'boost', 7, 50, 2, 15, '["2x profile visibility", "Priority in discover", "15 daily likes", "AI-powered icebreakers", "See who liked you"]', 'limited_free', 5, false, true, 1),
('Pro Network', 'pro', 30, 150, 5, NULL, '["5x profile visibility", "Top priority matching", "Unlimited likes", "Premium AI coach", "Rewind last skip", "Business networking badge", "Analytics dashboard"]', 'unlimited', NULL, true, true, 2);

-- Insert default ASPN tiers
INSERT INTO public.aspn_tiers (tier_name, tier_key, price_php, admin_profit_percent, aspn_pool_percent, sp_rate, lifetime_cap, display_order) VALUES
('Bronze', 'bronze', 0, 50, 20, 0.5, 50000, 0),
('Silver', 'silver', 500, 45, 25, 1.0, 100000, 1),
('Gold', 'gold', 1500, 40, 30, 1.5, 250000, 2),
('Platinum', 'platinum', 5000, 35, 35, 2.0, NULL, 3);

-- Insert default settings
INSERT INTO public.beesmate_activity_settings (setting_key, setting_value, description) VALUES
('monthly_subscription_required', 'true', 'Require monthly subscription to remain active'),
('min_shop_purchase_monthly', '100', 'Minimum shop purchase required per month in PHP'),
('grace_period_days', '7', 'Grace period before marking user as inactive');

INSERT INTO public.aspn_settings (setting_key, setting_value, description) VALUES
('sp_decay_per_level', '0.1', 'SP decay percentage per genealogy level'),
('max_sp_levels', '10', 'Maximum levels for SP to flow upward'),
('cycle_duration_days', '7', 'Duration of each ASPN distribution cycle'),
('min_sp_for_payout', '100', 'Minimum SP required to participate in pool distribution');