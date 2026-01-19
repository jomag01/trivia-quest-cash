-- Make product_id nullable in sponsored_products to allow user ads without specific products
ALTER TABLE sponsored_products ALTER COLUMN product_id DROP NOT NULL;

-- Update the sync function
CREATE OR REPLACE FUNCTION sync_user_ad_to_sponsored_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user_ad becomes active, create/update sponsored_product
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status != 'active') THEN
    INSERT INTO sponsored_products (
      id,
      seller_id,
      product_id,
      campaign_name,
      bid_amount,
      daily_budget,
      total_budget,
      spent_amount,
      status,
      start_date,
      end_date,
      placements,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.user_id,
      NULL,
      NEW.title,
      COALESCE(NEW.cost_per_view, 1),
      COALESCE(NEW.budget_diamonds::numeric, 100),
      COALESCE(NEW.budget_diamonds::numeric, 500),
      COALESCE(NEW.spent_diamonds::numeric, 0),
      'active',
      COALESCE(NEW.start_date, now()),
      NEW.end_date,
      ARRAY[COALESCE(NEW.placement, 'feed')],
      NEW.created_at,
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'active',
      campaign_name = EXCLUDED.campaign_name,
      daily_budget = EXCLUDED.daily_budget,
      total_budget = EXCLUDED.total_budget,
      updated_at = now();
  END IF;
  
  -- When a user_ad is paused/rejected/completed, deactivate sponsored_product
  IF NEW.status IN ('paused', 'rejected', 'completed') AND (OLD IS NULL OR OLD.status = 'active') THEN
    UPDATE sponsored_products 
    SET status = NEW.status,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS sync_user_ad_trigger ON user_ads;
CREATE TRIGGER sync_user_ad_trigger
  AFTER INSERT OR UPDATE OF status ON user_ads
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_ad_to_sponsored_products();

-- Sync existing active user_ads to sponsored_products
INSERT INTO sponsored_products (
  id, seller_id, product_id, campaign_name, bid_amount, daily_budget, total_budget, 
  spent_amount, status, start_date, end_date, placements, created_at, updated_at
)
SELECT 
  ua.id,
  ua.user_id,
  NULL,
  ua.title,
  COALESCE(ua.cost_per_view, 1),
  COALESCE(ua.budget_diamonds::numeric, 100),
  COALESCE(ua.budget_diamonds::numeric, 500),
  COALESCE(ua.spent_diamonds::numeric, 0),
  'active',
  COALESCE(ua.start_date, ua.created_at),
  ua.end_date,
  ARRAY[COALESCE(ua.placement, 'feed')],
  ua.created_at,
  now()
FROM user_ads ua
WHERE ua.status = 'active'
ON CONFLICT (id) DO UPDATE SET
  status = 'active',
  campaign_name = EXCLUDED.campaign_name,
  updated_at = now();