-- Create function to distribute ad revenue to commission pools
CREATE OR REPLACE FUNCTION public.distribute_ad_revenue(
  p_ad_id UUID,
  p_seller_id UUID,
  p_total_amount INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_percentage NUMERIC;
  v_unilevel_percentage NUMERIC;
  v_stairstep_percentage NUMERIC;
  v_leadership_percentage NUMERIC;
  v_admin_profit INTEGER;
  v_unilevel_pool INTEGER;
  v_stairstep_pool INTEGER;
  v_leadership_pool INTEGER;
  v_upline_id UUID;
  v_level INTEGER := 1;
  v_commission_rate NUMERIC;
  v_commission_amount INTEGER;
  v_unilevel_distributed INTEGER := 0;
  v_stairstep_distributed INTEGER := 0;
  v_leadership_distributed INTEGER := 0;
BEGIN
  -- Get revenue distribution percentages
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'admin_net_profit_percentage'),
    40
  ) INTO v_admin_percentage;
  
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'unilevel_pool_percentage'),
    25
  ) INTO v_unilevel_percentage;
  
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'stairstep_pool_percentage'),
    20
  ) INTO v_stairstep_percentage;
  
  SELECT COALESCE(
    (SELECT setting_value::NUMERIC FROM ad_revenue_settings WHERE setting_key = 'leadership_pool_percentage'),
    15
  ) INTO v_leadership_percentage;

  -- Calculate pool amounts
  v_admin_profit := FLOOR(p_total_amount * v_admin_percentage / 100);
  v_unilevel_pool := FLOOR(p_total_amount * v_unilevel_percentage / 100);
  v_stairstep_pool := FLOOR(p_total_amount * v_stairstep_percentage / 100);
  v_leadership_pool := FLOOR(p_total_amount * v_leadership_percentage / 100);

  -- Get seller's upline for unilevel distribution
  SELECT referred_by INTO v_upline_id FROM profiles WHERE id = p_seller_id;

  -- Distribute unilevel commissions (up to 7 levels)
  WHILE v_upline_id IS NOT NULL AND v_level <= 7 LOOP
    -- Get commission rate for this level
    SELECT COALESCE(
      (SELECT commission_percentage FROM unilevel_commission_rates WHERE level_number = v_level),
      CASE v_level
        WHEN 1 THEN 4.0
        WHEN 2 THEN 3.0
        WHEN 3 THEN 2.5
        WHEN 4 THEN 2.0
        WHEN 5 THEN 1.5
        WHEN 6 THEN 1.0
        WHEN 7 THEN 0.5
        ELSE 0
      END
    ) INTO v_commission_rate;

    v_commission_amount := FLOOR(v_unilevel_pool * v_commission_rate / 14.5); -- Normalize to 100% of pool

    IF v_commission_amount > 0 THEN
      -- Add to user's diamond balance
      UPDATE profiles
      SET diamonds = COALESCE(diamonds, 0) + v_commission_amount
      WHERE id = v_upline_id;

      -- Record commission
      INSERT INTO commission_history (user_id, amount, commission_type, source_order_id, level)
      VALUES (v_upline_id, v_commission_amount, 'unilevel_ad', p_ad_id, v_level);

      v_unilevel_distributed := v_unilevel_distributed + v_commission_amount;
    END IF;

    -- Move to next upline
    SELECT referred_by INTO v_upline_id FROM profiles WHERE id = v_upline_id;
    v_level := v_level + 1;
  END LOOP;

  -- Record the revenue distribution
  INSERT INTO ad_revenue_distributions (
    ad_id,
    seller_id,
    total_revenue,
    admin_profit,
    unilevel_distributed,
    stairstep_distributed,
    leadership_distributed
  ) VALUES (
    p_ad_id,
    p_seller_id,
    p_total_amount,
    v_admin_profit,
    v_unilevel_distributed,
    v_stairstep_pool, -- Full pool to stairstep
    v_leadership_pool -- Full pool to leadership
  );

END;
$$;

-- Update ad_revenue_distributions to allow any UUID for ad_id (not just slider ads)
ALTER TABLE public.ad_revenue_distributions DROP CONSTRAINT IF EXISTS ad_revenue_distributions_ad_id_fkey;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ad_revenue_distributions_seller ON ad_revenue_distributions(seller_id);
CREATE INDEX IF NOT EXISTS idx_ad_revenue_distributions_created ON ad_revenue_distributions(created_at DESC);