-- Add commission and impression tracking to sponsored_listings
ALTER TABLE public.sponsored_listings 
ADD COLUMN IF NOT EXISTS total_impressions_target integer DEFAULT 1000,
ADD COLUMN IF NOT EXISTS impressions_delivered integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS referrer_commission_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS unilevel_commission_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS stairstep_commission_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS leadership_commission_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_profit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_impression_at timestamptz,
ADD COLUMN IF NOT EXISTS daily_impression_cap integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS priority_score numeric DEFAULT 1.0;

-- Add commission configuration to sponsored_listing_settings
ALTER TABLE public.sponsored_listing_settings
ADD COLUMN IF NOT EXISTS enable_affiliate_commissions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS unilevel_percentage numeric DEFAULT 40,
ADD COLUMN IF NOT EXISTS stairstep_percentage numeric DEFAULT 35,
ADD COLUMN IF NOT EXISTS leadership_percentage numeric DEFAULT 25,
ADD COLUMN IF NOT EXISTS referrer_commission_percentage numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS cost_per_impression numeric DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS min_impressions_per_day integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS max_impressions_per_day integer DEFAULT 5000,
ADD COLUMN IF NOT EXISTS instructions text DEFAULT 'Pay to GCash: 09XX-XXX-XXXX. Upload screenshot as proof.';

-- Create table for tracking ad impressions and performance
CREATE TABLE IF NOT EXISTS public.sponsored_listing_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_listing_id uuid REFERENCES public.sponsored_listings(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  visitor_id text,
  device_type text,
  placement_key text,
  is_clicked boolean DEFAULT false,
  clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create table for ad commission distributions
CREATE TABLE IF NOT EXISTS public.sponsored_listing_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_listing_id uuid REFERENCES public.sponsored_listings(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) NOT NULL,
  commission_type text NOT NULL CHECK (commission_type IN ('referrer', 'unilevel', 'stairstep', 'leadership', 'admin')),
  amount numeric NOT NULL DEFAULT 0,
  level_from_source integer,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsored_listing_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsored_listing_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for impressions
CREATE POLICY "Anyone can insert impressions" ON public.sponsored_listing_impressions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own impressions" ON public.sponsored_listing_impressions
FOR SELECT USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS policies for commissions
CREATE POLICY "Users can view own commissions" ON public.sponsored_listing_commissions
FOR SELECT USING (recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage commissions" ON public.sponsored_listing_commissions
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Function to calculate ad priority score (Facebook-like algorithm)
CREATE OR REPLACE FUNCTION public.calculate_ad_priority_score(
  p_budget numeric,
  p_daily_budget numeric,
  p_impressions_delivered integer,
  p_impressions_target integer,
  p_ctr numeric,
  p_boost_multiplier numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delivery_pacing numeric;
  performance_score numeric;
  budget_score numeric;
BEGIN
  -- Calculate delivery pacing (how far behind/ahead we are)
  IF p_impressions_target > 0 THEN
    delivery_pacing := 1 - (p_impressions_delivered::numeric / p_impressions_target);
  ELSE
    delivery_pacing := 1;
  END IF;
  
  -- Performance score based on CTR
  performance_score := GREATEST(0.1, COALESCE(p_ctr, 0) * 10 + 0.5);
  
  -- Budget score - higher budget = higher priority
  budget_score := LEAST(2.0, p_daily_budget / 100);
  
  -- Final score combines all factors
  RETURN GREATEST(0.1, delivery_pacing * performance_score * budget_score * COALESCE(p_boost_multiplier, 1));
END;
$$;

-- Function to distribute sponsored listing commissions
CREATE OR REPLACE FUNCTION public.distribute_sponsored_listing_commissions(
  p_sponsored_listing_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing record;
  v_settings record;
  v_referrer_id uuid;
  v_referrer_commission numeric := 0;
  v_unilevel_pool numeric := 0;
  v_stairstep_pool numeric := 0;
  v_leadership_pool numeric := 0;
  v_admin_profit numeric := 0;
  v_remaining numeric;
  v_upline record;
  v_level integer := 0;
  v_level_percent numeric;
BEGIN
  -- Get the listing
  SELECT * INTO v_listing FROM sponsored_listings WHERE id = p_sponsored_listing_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- Get settings for this listing type
  SELECT * INTO v_settings FROM sponsored_listing_settings WHERE listing_type = v_listing.listing_type;
  
  -- Check if affiliate commissions are enabled
  IF v_settings IS NULL OR NOT v_settings.enable_affiliate_commissions THEN
    -- All goes to admin
    UPDATE sponsored_listings SET admin_profit = admin_profit + p_amount WHERE id = p_sponsored_listing_id;
    
    INSERT INTO sponsored_listing_commissions (sponsored_listing_id, recipient_id, commission_type, amount, status)
    SELECT p_sponsored_listing_id, user_id, 'admin', p_amount, 'pending'
    FROM user_roles WHERE role = 'admin' LIMIT 1;
    RETURN;
  END IF;
  
  v_remaining := p_amount;
  
  -- Referrer commission first
  IF v_listing.referrer_id IS NOT NULL AND v_settings.referrer_commission_percentage > 0 THEN
    v_referrer_commission := p_amount * (v_settings.referrer_commission_percentage / 100);
    v_remaining := v_remaining - v_referrer_commission;
    
    INSERT INTO sponsored_listing_commissions (sponsored_listing_id, recipient_id, commission_type, amount, status)
    VALUES (p_sponsored_listing_id, v_listing.referrer_id, 'referrer', v_referrer_commission, 'pending');
    
    UPDATE sponsored_listings SET referrer_commission_paid = referrer_commission_paid + v_referrer_commission 
    WHERE id = p_sponsored_listing_id;
  END IF;
  
  -- Split remaining among pools
  v_unilevel_pool := v_remaining * (v_settings.unilevel_percentage / 100);
  v_stairstep_pool := v_remaining * (v_settings.stairstep_percentage / 100);
  v_leadership_pool := v_remaining * (v_settings.leadership_percentage / 100);
  v_admin_profit := v_remaining - v_unilevel_pool - v_stairstep_pool - v_leadership_pool;
  
  -- Update listing totals
  UPDATE sponsored_listings SET 
    unilevel_commission_paid = unilevel_commission_paid + v_unilevel_pool,
    stairstep_commission_paid = stairstep_commission_paid + v_stairstep_pool,
    leadership_commission_paid = leadership_commission_paid + v_leadership_pool,
    admin_profit = admin_profit + v_admin_profit
  WHERE id = p_sponsored_listing_id;
  
  -- Distribute unilevel commissions (7 levels)
  FOR v_upline IN
    WITH RECURSIVE upline AS (
      SELECT referred_by, 1 as level FROM profiles WHERE id = v_listing.user_id
      UNION ALL
      SELECT p.referred_by, u.level + 1 FROM profiles p JOIN upline u ON p.id = u.referred_by WHERE u.level < 7
    )
    SELECT referred_by as user_id, level FROM upline WHERE referred_by IS NOT NULL
  LOOP
    CASE v_upline.level
      WHEN 1 THEN v_level_percent := 4;
      WHEN 2 THEN v_level_percent := 3;
      WHEN 3 THEN v_level_percent := 2.5;
      WHEN 4 THEN v_level_percent := 2;
      WHEN 5 THEN v_level_percent := 1.5;
      WHEN 6 THEN v_level_percent := 1;
      WHEN 7 THEN v_level_percent := 0.5;
      ELSE v_level_percent := 0;
    END CASE;
    
    IF v_level_percent > 0 THEN
      INSERT INTO sponsored_listing_commissions (sponsored_listing_id, recipient_id, commission_type, amount, level_from_source, status)
      VALUES (p_sponsored_listing_id, v_upline.user_id, 'unilevel', v_unilevel_pool * (v_level_percent / 14.5), v_upline.level, 'pending');
    END IF;
  END LOOP;
END;
$$;

-- Enable realtime for sponsored listings
ALTER PUBLICATION supabase_realtime ADD TABLE public.sponsored_listing_impressions;