
-- Create trigger function to fire commission distribution when ad campaign completes
CREATE OR REPLACE FUNCTION public.on_ad_campaign_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
  v_commission_already_distributed boolean;
  v_ad_source_type text := 'ad_purchase';
BEGIN
  -- Only fire when status changes TO 'completed' or 'expired' 
  -- or when delivery_status changes to 'exhausted'
  IF (
    (NEW.status IN ('completed', 'expired') AND (OLD.status IS DISTINCT FROM NEW.status))
    OR 
    (NEW.delivery_status = 'exhausted' AND OLD.delivery_status IS DISTINCT FROM NEW.delivery_status)
  ) THEN
    
    -- Check if commission was already distributed for this ad
    SELECT EXISTS(
      SELECT 1 FROM commissions 
      WHERE related_order_id = NEW.id 
        AND commission_type = 'unilevel' 
        AND notes LIKE '%ad_purchase%'
      LIMIT 1
    ) INTO v_commission_already_distributed;
    
    IF v_commission_already_distributed THEN
      RETURN NEW;
    END IF;
    
    -- Mark status as completed if it was exhausted
    IF NEW.delivery_status = 'exhausted' AND NEW.status NOT IN ('completed', 'expired') THEN
      NEW.status := 'completed';
    END IF;
    
    -- Distribute commissions using the universal commission function
    -- The amount is the total_budget (what the advertiser paid)
    IF NEW.total_budget > 0 AND NEW.seller_id IS NOT NULL THEN
      SELECT distribute_universal_commission(
        p_buyer_id := NEW.seller_id,  -- The advertiser is the "buyer" of ad service
        p_amount := NEW.total_budget,
        p_source_type := v_ad_source_type,
        p_source_id := NEW.id,
        p_seller_id := NULL  -- Platform is the seller
      ) INTO v_result;
      
      -- Log the distribution in ad_revenue_distributions
      INSERT INTO ad_revenue_distributions (
        ad_id, seller_id, total_revenue, admin_profit, 
        unilevel_distributed, stairstep_distributed, leadership_distributed
      ) VALUES (
        NEW.id, 
        NEW.seller_id, 
        NEW.total_budget,
        COALESCE((v_result->>'admin_profit')::numeric, 0),
        COALESCE((v_result->>'unilevel_distributed')::numeric, 0),
        COALESCE((v_result->>'stairstep_distributed')::numeric, 0),
        COALESCE((v_result->>'leadership_distributed')::numeric, 0)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_ad_campaign_completed ON public.sponsored_products;

-- Create trigger on sponsored_products
CREATE TRIGGER trigger_ad_campaign_completed
BEFORE UPDATE ON public.sponsored_products
FOR EACH ROW
EXECUTE FUNCTION public.on_ad_campaign_completed();

-- Also update the commission type constraint to include ad_purchase
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_commission_type_check;

ALTER TABLE public.commissions ADD CONSTRAINT commissions_commission_type_check 
CHECK (commission_type = ANY (ARRAY[
  'purchase_commission', 
  'diamond_commission', 
  'network_commission',
  'unilevel_commission',
  'stairstep_commission',
  'stair_step_cash',
  'leadership_commission',
  'network_commission',
  'product_commission',
  'ai_commission',
  'service_commission',
  'seller_referral',
  'ad_commission',
  'binary_commission',
  'referral_commission',
  'unilevel',
  'stairstep', 
  'leadership',
  'ad_purchase',
  'beesmate',
  'ai_hub',
  'auction',
  'marketplace',
  'food',
  'booking'
]));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.on_ad_campaign_completed() TO authenticated;
