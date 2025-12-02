-- Create user_ads table for paid user-created ads
CREATE TABLE IF NOT EXISTS public.user_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  target_category TEXT, -- product category or interest
  target_behavior TEXT[], -- array of behaviors: view, click, purchase, etc
  budget_diamonds INT NOT NULL DEFAULT 0, -- total budget in diamonds
  spent_diamonds INT NOT NULL DEFAULT 0, -- diamonds spent so far
  cost_per_view DECIMAL(10,2) NOT NULL DEFAULT 0.10, -- cost per impression in diamonds
  views_count INT NOT NULL DEFAULT 0,
  clicks_count INT NOT NULL DEFAULT 0,
  conversions_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, active, paused, completed, rejected
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_ads ENABLE ROW LEVEL SECURITY;

-- Users can view their own ads
CREATE POLICY "Users can view own ads"
ON public.user_ads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create ads if they meet requirements (checked in app)
CREATE POLICY "Users can create ads"
ON public.user_ads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ads
CREATE POLICY "Users can update own ads"
ON public.user_ads
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all ads (using security definer function)
CREATE POLICY "Admins can view all ads"
ON public.user_ads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update any ad
CREATE POLICY "Admins can update any ad"
ON public.user_ads
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_user_ads_user_id ON public.user_ads(user_id);
CREATE INDEX idx_user_ads_status ON public.user_ads(status);
CREATE INDEX idx_user_ads_target_category ON public.user_ads(target_category);

-- Create ad_impressions table to track who saw which ad
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.user_ads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  clicked BOOLEAN DEFAULT false,
  converted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert impressions (for tracking)
CREATE POLICY "Anyone can insert impressions"
ON public.ad_impressions
FOR INSERT
WITH CHECK (true);

-- Ad owners can view their ad impressions
CREATE POLICY "Ad owners can view impressions"
ON public.ad_impressions
FOR SELECT
USING (
  ad_id IN (
    SELECT id FROM public.user_ads WHERE user_id = auth.uid()
  )
);

-- Admins can view all impressions
CREATE POLICY "Admins can view all impressions"
ON public.ad_impressions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_ad_impressions_ad_id ON public.ad_impressions(ad_id);
CREATE INDEX idx_ad_impressions_user_id ON public.ad_impressions(user_id);

-- Create function to check if user meets ad creation requirements
CREATE OR REPLACE FUNCTION public.can_create_ads(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  diamond_count INT;
  referral_count INT;
  current_step INT;
BEGIN
  -- Check diamond balance (need 150+)
  SELECT COALESCE(diamonds, 0) INTO diamond_count
  FROM public.treasure_wallet
  WHERE user_id = user_id_param;
  
  IF diamond_count < 150 THEN
    RETURN false;
  END IF;
  
  -- Check referral count (need 2+)
  SELECT COUNT(*) INTO referral_count
  FROM public.referrals
  WHERE referrer_id = user_id_param;
  
  IF referral_count < 2 THEN
    RETURN false;
  END IF;
  
  -- Check stair step level (need step 2+)
  SELECT COALESCE(current_step, 0) INTO current_step
  FROM public.affiliate_current_rank
  WHERE user_id = user_id_param;
  
  IF current_step < 2 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;