-- Create function to calculate stair-step differential commissions
CREATE OR REPLACE FUNCTION public.distribute_stair_step_commissions(
  purchase_id_param UUID,
  buyer_id UUID,
  amount_param DECIMAL,
  is_credit_purchase BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := buyer_id;
  upline_id UUID;
  level_counter INTEGER := 0;
  max_levels INTEGER := 10;
  upline_rank RECORD;
  current_user_rank RECORD;
  differential_rate DECIMAL;
  commission_amount DECIMAL;
  breakaway_commission DECIMAL;
  step_3_users UUID[];
BEGIN
  -- Update monthly sales for the buyer (personal sale)
  PERFORM update_affiliate_monthly_sales(buyer_id, amount_param, true);
  
  -- Check and update buyer's rank
  PERFORM check_and_update_affiliate_rank(buyer_id);
  
  -- Get buyer's current rank
  SELECT * INTO current_user_rank
  FROM affiliate_current_rank
  WHERE user_id = buyer_id;
  
  -- Traverse upline to distribute commissions
  WHILE level_counter < max_levels LOOP
    level_counter := level_counter + 1;
    
    -- Get upline
    SELECT referred_by INTO upline_id
    FROM profiles
    WHERE id = current_user_id;
    
    EXIT WHEN upline_id IS NULL;
    
    -- Update team sales for upline
    PERFORM update_affiliate_monthly_sales(upline_id, amount_param, false);
    
    -- Check and update upline's rank
    PERFORM check_and_update_affiliate_rank(upline_id);
    
    -- Get upline's rank
    SELECT acr.*, ssc.commission_percentage, ssc.breakaway_percentage
    INTO upline_rank
    FROM affiliate_current_rank acr
    LEFT JOIN stair_step_config ssc ON ssc.step_number = acr.current_step AND ssc.active = true
    WHERE acr.user_id = upline_id;
    
    -- Calculate differential commission
    IF upline_rank IS NOT NULL AND upline_rank.current_step > 0 THEN
      -- Get current user's commission rate (0 if unqualified)
      IF current_user_rank IS NULL OR current_user_rank.current_step = 0 THEN
        differential_rate := upline_rank.commission_percentage;
      ELSIF upline_rank.current_step > current_user_rank.current_step THEN
        -- Upline earns differential between their rate and downline's rate
        SELECT commission_percentage INTO differential_rate
        FROM stair_step_config
        WHERE step_number = current_user_rank.current_step AND active = true;
        
        differential_rate := upline_rank.commission_percentage - COALESCE(differential_rate, 0);
      ELSIF upline_rank.current_step = current_user_rank.current_step THEN
        -- Same level, no commission
        differential_rate := 0;
      ELSE
        -- Downline has higher rank, no commission
        differential_rate := 0;
      END IF;
      
      -- Calculate commission amount
      commission_amount := (amount_param * differential_rate / 100);
      
      -- Insert commission if amount > 0
      IF commission_amount > 0 THEN
        INSERT INTO commissions (
          user_id,
          from_user_id,
          commission_type,
          amount,
          level,
          purchase_id,
          notes
        )
        VALUES (
          upline_id,
          buyer_id,
          CASE WHEN is_credit_purchase THEN 'stair_step_credit' ELSE 'stair_step_product' END,
          commission_amount,
          level_counter,
          purchase_id_param,
          'Stair-step differential: ' || differential_rate || '% at Step ' || upline_rank.current_step
        );
        
        -- Update wallet
        UPDATE user_wallets
        SET 
          balance = balance + commission_amount,
          total_commissions = total_commissions + commission_amount
        WHERE user_id = upline_id;
      END IF;
      
      -- Check for breakaway commission (Step 3 to Step 3)
      IF upline_rank.current_step = 3 AND current_user_rank IS NOT NULL AND current_user_rank.current_step = 3 THEN
        -- Track this Step 3 user for breakaway
        step_3_users := array_append(step_3_users, current_user_id);
      END IF;
    END IF;
    
    -- Update current rank for next iteration
    current_user_rank := upline_rank;
    current_user_id := upline_id;
  END LOOP;
  
  -- Process breakaway commissions for Step 3 organizations
  IF array_length(step_3_users, 1) > 0 THEN
    FOR current_user_id IN SELECT unnest(step_3_users)
    LOOP
      -- Find the upline of this Step 3 user
      SELECT p.referred_by, ssc.breakaway_percentage
      INTO upline_id, breakaway_commission
      FROM profiles p
      LEFT JOIN affiliate_current_rank acr ON acr.user_id = p.referred_by
      LEFT JOIN stair_step_config ssc ON ssc.step_number = acr.current_step AND ssc.active = true
      WHERE p.id = current_user_id
        AND acr.current_step = 3;
      
      IF upline_id IS NOT NULL AND breakaway_commission > 0 THEN
        commission_amount := (amount_param * breakaway_commission / 100);
        
        INSERT INTO commissions (
          user_id,
          from_user_id,
          commission_type,
          amount,
          level,
          purchase_id,
          notes
        )
        VALUES (
          upline_id,
          buyer_id,
          CASE WHEN is_credit_purchase THEN 'breakaway_credit' ELSE 'breakaway_product' END,
          commission_amount,
          99,  -- Special level indicator for breakaway
          purchase_id_param,
          'Breakaway override: ' || breakaway_commission || '% from Step 3 organization'
        );
        
        UPDATE user_wallets
        SET 
          balance = balance + commission_amount,
          total_commissions = total_commissions + commission_amount
        WHERE user_id = upline_id;
      END IF;
    END LOOP;
  END IF;
END;
$$;

-- Update credit purchase trigger to use new stair-step commission system
CREATE OR REPLACE FUNCTION public.handle_stair_step_credit_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM distribute_stair_step_commissions(NEW.id, NEW.user_id, NEW.amount, true);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS on_credit_purchase_completed ON public.credit_purchases;
CREATE TRIGGER on_credit_purchase_completed
  AFTER INSERT OR UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stair_step_credit_commission();

-- Create function to handle product purchase commissions
CREATE OR REPLACE FUNCTION public.handle_stair_step_product_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_price DECIMAL;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get product price from the purchase items
    SELECT SUM(oi.quantity * p.price)
    INTO product_price
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = NEW.id;
    
    IF product_price > 0 THEN
      PERFORM distribute_stair_step_commissions(NEW.id, NEW.user_id, product_price, false);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for product orders
DROP TRIGGER IF EXISTS on_product_order_completed ON public.orders;
CREATE TRIGGER on_product_order_completed
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stair_step_product_commission();