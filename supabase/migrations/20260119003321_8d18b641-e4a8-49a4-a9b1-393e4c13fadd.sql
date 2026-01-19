-- Function to sync user_ads to sponsored_products when ad becomes active
CREATE OR REPLACE FUNCTION public.sync_user_ad_to_sponsored_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Only trigger when status changes to 'active'
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    -- Check if this ad is already synced
    IF NOT EXISTS (
      SELECT 1 FROM sponsored_products 
      WHERE seller_id = NEW.user_id 
      AND campaign_name = 'User Ad: ' || NEW.title
    ) THEN
      -- Try to find a product by the seller, or use a placeholder
      SELECT id INTO v_product_id 
      FROM products 
      WHERE seller_id = NEW.user_id 
      LIMIT 1;
      
      -- If no product found, we still insert with a generated UUID
      IF v_product_id IS NULL THEN
        v_product_id := gen_random_uuid();
      END IF;

      INSERT INTO sponsored_products (
        seller_id,
        product_id,
        campaign_name,
        bid_amount,
        daily_budget,
        total_budget,
        spent_amount,
        quality_score,
        relevance_score,
        conversion_rate,
        impressions,
        clicks,
        conversions,
        status,
        placements,
        start_date,
        end_date
      ) VALUES (
        NEW.user_id,
        v_product_id,
        'User Ad: ' || NEW.title,
        COALESCE(NEW.cost_per_view, 0.10),
        COALESCE(NEW.budget_diamonds::NUMERIC, 100),
        COALESCE(NEW.budget_diamonds::NUMERIC, 100),
        COALESCE(NEW.spent_diamonds::NUMERIC, 0),
        0.5, -- Default quality score
        0.5, -- Default relevance score
        0,   -- Default conversion rate
        0,
        0,
        0,
        'active',
        ARRAY[COALESCE(NEW.placement, 'homepage')],
        COALESCE(NEW.start_date, NOW()),
        NEW.end_date
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_ads table
DROP TRIGGER IF EXISTS trigger_sync_user_ad_to_sponsored ON user_ads;
CREATE TRIGGER trigger_sync_user_ad_to_sponsored
  AFTER INSERT OR UPDATE ON user_ads
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_ad_to_sponsored_products();

-- Sync existing active user_ads to sponsored_products
INSERT INTO sponsored_products (
  seller_id,
  product_id,
  campaign_name,
  bid_amount,
  daily_budget,
  total_budget,
  spent_amount,
  quality_score,
  relevance_score,
  conversion_rate,
  impressions,
  clicks,
  conversions,
  status,
  placements,
  start_date,
  end_date
)
SELECT 
  ua.user_id,
  COALESCE(
    (SELECT id FROM products WHERE seller_id = ua.user_id LIMIT 1),
    gen_random_uuid()
  ),
  'User Ad: ' || ua.title,
  COALESCE(ua.cost_per_view, 0.10),
  COALESCE(ua.budget_diamonds::NUMERIC, 100),
  COALESCE(ua.budget_diamonds::NUMERIC, 100),
  COALESCE(ua.spent_diamonds::NUMERIC, 0),
  0.5,
  0.5,
  0,
  COALESCE(ua.views_count, 0),
  COALESCE(ua.clicks_count, 0),
  COALESCE(ua.conversions_count, 0),
  'active',
  ARRAY[COALESCE(ua.placement, 'homepage')],
  COALESCE(ua.start_date, ua.created_at),
  ua.end_date
FROM user_ads ua
WHERE ua.status = 'active' 
  AND ua.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM sponsored_products sp 
    WHERE sp.seller_id = ua.user_id 
    AND sp.campaign_name = 'User Ad: ' || ua.title
  );

-- Function to promote a product directly (for sellers)
CREATE OR REPLACE FUNCTION public.promote_product(
  p_product_id UUID,
  p_seller_id UUID,
  p_campaign_name TEXT,
  p_bid_amount NUMERIC,
  p_daily_budget NUMERIC,
  p_total_budget NUMERIC,
  p_placements TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sponsored_id UUID;
BEGIN
  INSERT INTO sponsored_products (
    seller_id,
    product_id,
    campaign_name,
    bid_amount,
    daily_budget,
    total_budget,
    spent_amount,
    quality_score,
    relevance_score,
    conversion_rate,
    impressions,
    clicks,
    conversions,
    status,
    placements,
    start_date
  ) VALUES (
    p_seller_id,
    p_product_id,
    p_campaign_name,
    p_bid_amount,
    p_daily_budget,
    p_total_budget,
    0,
    0.5,
    0.5,
    0,
    0,
    0,
    0,
    'pending', -- Needs admin approval
    p_placements,
    NOW()
  )
  RETURNING id INTO v_sponsored_id;
  
  RETURN v_sponsored_id;
END;
$$;