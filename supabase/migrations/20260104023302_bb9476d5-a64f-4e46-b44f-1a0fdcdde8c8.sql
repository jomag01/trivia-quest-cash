-- Create AI subscription plans table
CREATE TABLE public.ai_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  credits_remaining INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  renewed_at TIMESTAMPTZ,
  renewal_count INTEGER NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  binary_volume_added BOOLEAN DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create subscription history for tracking all renewals
CREATE TABLE public.ai_subscription_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.ai_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL,
  credits_granted INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('purchase', 'renewal', 'topup', 'cancel', 'expire')),
  binary_volume_added NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  admin_approved_by UUID,
  admin_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create credit top-up purchases table
CREATE TABLE public.ai_credit_topups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.ai_subscriptions(id),
  amount NUMERIC NOT NULL,
  credits_purchased INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_profit NUMERIC DEFAULT 0,
  ai_cost_deduction NUMERIC DEFAULT 0,
  unilevel_commission NUMERIC DEFAULT 0,
  stairstep_commission NUMERIC DEFAULT 0,
  leadership_commission NUMERIC DEFAULT 0,
  referrer_id UUID,
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create monthly subscriber feature restrictions table
CREATE TABLE public.ai_monthly_restrictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default feature restrictions for monthly subscribers
INSERT INTO public.ai_monthly_restrictions (feature_key, feature_name, is_hidden, description) VALUES
  ('video_generator', 'Video Generator', false, 'AI video generation feature'),
  ('image_generator', 'Image Generator', false, 'AI image generation feature'),
  ('music_generator', 'Music Generator', false, 'AI music generation feature'),
  ('content_creator', 'Content Creator', false, 'AI content creation tools'),
  ('blog_writer', 'Blog Writer', false, 'AI blog writing assistant'),
  ('website_builder', 'Website Builder', false, 'AI website builder'),
  ('market_analysis', 'Market Analysis', false, 'AI market analysis tools'),
  ('social_media_manager', 'Social Media Manager', false, 'AI social media management'),
  ('deep_research', 'Deep Research', false, 'AI deep research assistant'),
  ('business_solutions', 'Business Solutions', false, 'AI business solutions'),
  ('creator_analytics', 'Creator Analytics', false, 'AI analytics for creators'),
  ('video_editor', 'Video Editor', false, 'AI video editing tools'),
  ('ads_maker', 'Ads Maker', false, 'AI advertisement creation');

-- Enable RLS on all new tables
ALTER TABLE public.ai_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_monthly_restrictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_subscriptions
CREATE POLICY "Users can view their own subscriptions"
ON public.ai_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
ON public.ai_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
ON public.ai_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- Admin policies for ai_subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.ai_subscriptions FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all subscriptions"
ON public.ai_subscriptions FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_subscription_history
CREATE POLICY "Users can view their own subscription history"
ON public.ai_subscription_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription history"
ON public.ai_subscription_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscription history"
ON public.ai_subscription_history FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_credit_topups
CREATE POLICY "Users can view their own topups"
ON public.ai_credit_topups FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own topups"
ON public.ai_credit_topups FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all topups"
ON public.ai_credit_topups FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all topups"
ON public.ai_credit_topups FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ai_monthly_restrictions (public read, admin write)
CREATE POLICY "Anyone can view feature restrictions"
ON public.ai_monthly_restrictions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage feature restrictions"
ON public.ai_monthly_restrictions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_ai_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ai_subscriptions
    WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at > now()
  );
END;
$$;

-- Function to get user's subscription type
CREATE OR REPLACE FUNCTION public.get_ai_subscription_type(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_type TEXT;
BEGIN
  SELECT plan_type INTO v_plan_type
  FROM public.ai_subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(v_plan_type, 'none');
END;
$$;

-- Function to add credits to subscription
CREATE OR REPLACE FUNCTION public.add_subscription_credits(
  p_user_id UUID,
  p_credits INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_subscriptions
  SET credits_remaining = credits_remaining + p_credits,
      updated_at = now()
  WHERE user_id = p_user_id
  AND status = 'active'
  AND expires_at > now();
  
  RETURN FOUND;
END;
$$;

-- Function to deduct credits from subscription
CREATE OR REPLACE FUNCTION public.deduct_subscription_credits(
  p_user_id UUID,
  p_credits INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  SELECT credits_remaining INTO v_current_credits
  FROM public.ai_subscriptions
  WHERE user_id = p_user_id
  AND status = 'active'
  AND expires_at > now()
  FOR UPDATE;
  
  IF v_current_credits IS NULL OR v_current_credits < p_credits THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.ai_subscriptions
  SET credits_remaining = credits_remaining - p_credits,
      updated_at = now()
  WHERE user_id = p_user_id
  AND status = 'active'
  AND expires_at > now();
  
  RETURN TRUE;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_ai_subscriptions_user_status ON public.ai_subscriptions(user_id, status);
CREATE INDEX idx_ai_subscriptions_expires ON public.ai_subscriptions(expires_at);
CREATE INDEX idx_ai_subscription_history_user ON public.ai_subscription_history(user_id);
CREATE INDEX idx_ai_credit_topups_user ON public.ai_credit_topups(user_id);
CREATE INDEX idx_ai_credit_topups_status ON public.ai_credit_topups(status);

-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_subscriptions;