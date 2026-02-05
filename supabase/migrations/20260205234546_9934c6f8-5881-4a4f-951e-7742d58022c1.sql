-- Create optimized sales analytics RPC function
CREATE OR REPLACE FUNCTION public.get_sales_analytics_aggregated()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'productSales', COALESCE((SELECT SUM(total_amount) FROM orders WHERE status = 'delivered'), 0),
    'foodOrderSales', COALESCE((SELECT SUM(total_amount) FROM food_orders WHERE status = 'delivered'), 0),
    'bookingSales', COALESCE((SELECT COUNT(*) * 500 FROM service_bookings WHERE status = 'completed'), 0),
    'marketplaceSales', COALESCE((SELECT SUM(ml.price) FROM marketplace_inquiries mi JOIN marketplace_listings ml ON mi.listing_id = ml.id WHERE mi.status = 'accepted'), 0),
    'creditCashins', COALESCE((SELECT SUM(amount) FROM credit_purchases WHERE status = 'approved'), 0),
    'diamondCashins', COALESCE((SELECT SUM(total_price) FROM diamond_transactions WHERE status = 'completed'), 0),
    'aiCreditPurchases', COALESCE((SELECT SUM(amount) FROM ai_credit_topups WHERE status = 'approved'), 0),
    'auctionSales', COALESCE((SELECT SUM(amount) FROM auction_escrow WHERE status = 'released'), 0),
    'adPurchases', COALESCE((SELECT SUM(total_budget) FROM ad_spend_requests WHERE status = 'approved'), 0),
    'supplierMarkup', COALESCE((SELECT SUM(commission_amount) FROM retailer_supplier_commissions), 0),
    'beesmateRevenue', COALESCE((SELECT SUM(amount_paid) FROM beesmate_subscription_payments WHERE status = 'completed'), 0),
    'beesmateAdminProfit', COALESCE((SELECT SUM(admin_profit) FROM beesmate_subscription_payments WHERE status = 'completed'), 0),
    'beesmateUnilevelPool', COALESCE((SELECT SUM(unilevel_pool) FROM beesmate_subscription_payments WHERE status = 'completed'), 0),
    'beesmateStairstepPool', COALESCE((SELECT SUM(stairstep_pool) FROM beesmate_subscription_payments WHERE status = 'completed'), 0),
    'beesmateLeadershipPool', COALESCE((SELECT SUM(leadership_pool) FROM beesmate_subscription_payments WHERE status = 'completed'), 0),
    'unilevelPayouts', COALESCE((SELECT SUM(amount) FROM commissions WHERE commission_type IN ('purchase', 'unilevel', 'unilevel_commission', 'ai_credit_unilevel') AND level BETWEEN 1 AND 7), 0),
    'stairstepPayouts', COALESCE((SELECT SUM(amount) FROM commissions WHERE commission_type IN ('stair_step', 'stairstep', 'stairstep_commission', 'stair_step_cash')), 0),
    'breakawayPayouts', COALESCE((SELECT SUM(amount) FROM commissions WHERE commission_type = 'breakaway'), 0),
    'leadershipPayouts', COALESCE((SELECT SUM(amount) FROM leadership_commissions), 0),
    'sellerReferrerPayouts', COALESCE((SELECT SUM(referrer_commission) FROM seller_referrer_earnings), 0),
    'aiCreditCosts', 0
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Create unified commission distribution function for all services
CREATE OR REPLACE FUNCTION public.distribute_universal_commission(
  p_buyer_id uuid,
  p_amount numeric,
  p_source_type text, -- 'shop', 'ai_hub', 'beesmate', 'auction', 'marketplace', 'food', 'booking'
  p_source_id uuid DEFAULT NULL,
  p_seller_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_unilevel_percent numeric := 40;
  v_stairstep_percent numeric := 35;
  v_leadership_percent numeric := 25;
  v_affiliate_pool numeric;
  v_unilevel_amount numeric;
  v_stairstep_amount numeric;
  v_leadership_amount numeric;
  v_admin_profit numeric;
  v_level int := 1;
  v_upline_id uuid;
  v_level_percent numeric;
  v_commission_amount numeric;
  v_result json;
BEGIN
  -- Get commission percentages from settings if available
  SELECT COALESCE(value::numeric, 40) INTO v_unilevel_percent FROM app_settings WHERE key = 'unilevel_total_percent';
  SELECT COALESCE(value::numeric, 35) INTO v_stairstep_percent FROM app_settings WHERE key = 'stairstep_total_percent';
  SELECT COALESCE(value::numeric, 25) INTO v_leadership_percent FROM app_settings WHERE key = 'leadership_total_percent';
  
  -- Get buyer's referrer
  SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = p_buyer_id;
  
  IF v_referrer_id IS NULL THEN
    -- No referrer, all goes to admin
    v_admin_profit := p_amount * 0.65;
    
    RETURN json_build_object(
      'success', true,
      'admin_profit', v_admin_profit,
      'unilevel_distributed', 0,
      'stairstep_distributed', 0,
      'leadership_distributed', 0,
      'message', 'No referrer found, admin profit credited'
    );
  END IF;
  
  -- Calculate distribution pools (65% to affiliates, 35% to admin)
  v_affiliate_pool := p_amount * 0.65;
  v_admin_profit := p_amount * 0.35;
  
  v_unilevel_amount := v_affiliate_pool * (v_unilevel_percent / 100);
  v_stairstep_amount := v_affiliate_pool * (v_stairstep_percent / 100);
  v_leadership_amount := v_affiliate_pool * (v_leadership_percent / 100);
  
  -- Distribute Unilevel (7 levels)
  v_upline_id := v_referrer_id;
  v_level := 1;
  
  WHILE v_upline_id IS NOT NULL AND v_level <= 7 LOOP
    -- Get level percentage from settings or use defaults
    SELECT COALESCE(value::numeric, 
      CASE v_level 
        WHEN 1 THEN 4 
        WHEN 2 THEN 3 
        WHEN 3 THEN 2.5 
        WHEN 4 THEN 2 
        WHEN 5 THEN 1.5 
        WHEN 6 THEN 1 
        WHEN 7 THEN 0.5 
      END
    ) INTO v_level_percent 
    FROM app_settings 
    WHERE key = 'unilevel_level_' || v_level || '_percent';
    
    v_commission_amount := v_unilevel_amount * (v_level_percent / 14.5);
    
    IF v_commission_amount > 0 THEN
      -- Insert commission record
      INSERT INTO commissions (user_id, from_user_id, amount, commission_type, level, related_order_id, notes)
      VALUES (v_upline_id, p_buyer_id, v_commission_amount, 'unilevel', v_level, p_source_id, 
              'Unilevel L' || v_level || ' from ' || p_source_type);
      
      -- Update wallet
      INSERT INTO user_wallets (user_id, balance, total_commissions)
      VALUES (v_upline_id, v_commission_amount, v_commission_amount)
      ON CONFLICT (user_id) DO UPDATE SET
        balance = user_wallets.balance + v_commission_amount,
        total_commissions = user_wallets.total_commissions + v_commission_amount;
      
      -- Create notification
      INSERT INTO commission_notifications (user_id, source_type, source_id, amount, message)
      VALUES (v_upline_id, p_source_type, p_source_id, v_commission_amount, 
              'Earned ₱' || ROUND(v_commission_amount, 2) || ' Unilevel L' || v_level || ' from ' || p_source_type);
    END IF;
    
    -- Get next upline
    SELECT referred_by INTO v_upline_id FROM profiles WHERE id = v_upline_id;
    v_level := v_level + 1;
  END LOOP;
  
  -- Distribute Stairstep (to qualified managers)
  INSERT INTO commissions (user_id, from_user_id, amount, commission_type, level, related_order_id, notes)
  SELECT acr.user_id, p_buyer_id, v_stairstep_amount * 0.5, 'stairstep', acr.current_step, p_source_id,
         'Stairstep from ' || p_source_type
  FROM affiliate_current_rank acr
  WHERE acr.current_step >= 3
    AND acr.user_id IN (
      WITH RECURSIVE uplines AS (
        SELECT referred_by as uid, 1 as depth FROM profiles WHERE id = p_buyer_id
        UNION ALL
        SELECT p.referred_by, u.depth + 1 FROM profiles p JOIN uplines u ON p.id = u.uid WHERE u.depth < 20
      )
      SELECT uid FROM uplines WHERE uid IS NOT NULL
    )
  LIMIT 2;
  
  -- Update stairstep recipient wallets
  UPDATE user_wallets SET 
    balance = balance + v_stairstep_amount * 0.5,
    total_commissions = total_commissions + v_stairstep_amount * 0.5
  WHERE user_id IN (
    SELECT acr.user_id FROM affiliate_current_rank acr
    WHERE acr.current_step >= 3
      AND acr.user_id IN (
        WITH RECURSIVE uplines AS (
          SELECT referred_by as uid FROM profiles WHERE id = p_buyer_id
          UNION ALL
          SELECT p.referred_by FROM profiles p JOIN uplines u ON p.id = u.uid
        )
        SELECT uid FROM uplines WHERE uid IS NOT NULL LIMIT 20
      )
    LIMIT 2
  );
  
  -- Distribute Leadership (2% to manager-level uplines with 2+ manager lines)
  INSERT INTO leadership_commissions (user_id, from_user_id, from_order_id, amount, bonus_percent, notes)
  SELECT DISTINCT p.id, p_buyer_id, p_source_id, v_leadership_amount * 0.02, 2,
         'Leadership 2% from ' || p_source_type
  FROM profiles p
  JOIN affiliate_current_rank acr ON p.id = acr.user_id
  WHERE acr.current_step >= 5
    AND p.id IN (
      WITH RECURSIVE uplines AS (
        SELECT referred_by as uid FROM profiles WHERE id = p_buyer_id
        UNION ALL
        SELECT pr.referred_by FROM profiles pr JOIN uplines u ON pr.id = u.uid
      )
      SELECT uid FROM uplines WHERE uid IS NOT NULL LIMIT 10
    )
  LIMIT 1;
  
  -- Update leadership recipient wallets
  UPDATE user_wallets SET 
    balance = balance + v_leadership_amount * 0.02,
    total_commissions = total_commissions + v_leadership_amount * 0.02
  WHERE user_id IN (
    SELECT p.id FROM profiles p
    JOIN affiliate_current_rank acr ON p.id = acr.user_id
    WHERE acr.current_step >= 5
      AND p.id IN (
        WITH RECURSIVE uplines AS (
          SELECT referred_by as uid FROM profiles WHERE id = p_buyer_id
          UNION ALL
          SELECT pr.referred_by FROM profiles pr JOIN uplines u ON pr.id = u.uid
        )
        SELECT uid FROM uplines WHERE uid IS NOT NULL LIMIT 10
      )
    LIMIT 1
  );
  
  -- Process seller referrer commission if applicable
  IF p_seller_id IS NOT NULL THEN
    PERFORM public.process_seller_referrer_commission(p_seller_id, p_source_id, p_amount, p_source_type);
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'admin_profit', v_admin_profit,
    'unilevel_distributed', v_unilevel_amount,
    'stairstep_distributed', v_stairstep_amount,
    'leadership_distributed', v_leadership_amount,
    'referrer_id', v_referrer_id
  );
END;
$$;

-- Create helper function for seller referrer processing
CREATE OR REPLACE FUNCTION public.process_seller_referrer_commission(
  p_seller_id uuid,
  p_order_id uuid,
  p_amount numeric,
  p_source_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_config record;
  v_admin_markup numeric;
  v_referrer_commission numeric;
BEGIN
  -- Get seller's referrer
  SELECT COALESCE(seller_referrer_id, referred_by) INTO v_referrer_id 
  FROM profiles WHERE id = p_seller_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get commission config
  SELECT * INTO v_config FROM seller_referrer_commissions 
  WHERE category = p_source_type AND is_active = TRUE LIMIT 1;
  
  IF v_config IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate commission
  v_admin_markup := p_amount * (COALESCE(v_config.admin_markup_percent, 10) / 100);
  v_referrer_commission := v_admin_markup * (COALESCE(v_config.commission_percent, 20) / 100);
  
  -- Insert earning record
  INSERT INTO seller_referrer_earnings (
    referrer_id, seller_id, order_id, source_category, sale_amount,
    admin_markup_amount, referrer_commission, status, processed_at
  ) VALUES (
    v_referrer_id, p_seller_id, p_order_id, p_source_type, p_amount,
    v_admin_markup, v_referrer_commission, 'processed', NOW()
  );
  
  -- Update wallet
  INSERT INTO user_wallets (user_id, balance, total_commissions)
  VALUES (v_referrer_id, v_referrer_commission, v_referrer_commission)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_wallets.balance + v_referrer_commission,
    total_commissions = user_wallets.total_commissions + v_referrer_commission;
  
  -- Create notification
  INSERT INTO commission_notifications (user_id, source_type, source_id, amount, message)
  VALUES (v_referrer_id, 'seller_referral', p_order_id, v_referrer_commission,
          'Earned ₱' || ROUND(v_referrer_commission, 2) || ' from your referred seller''s sale');
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_sales_analytics_aggregated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.distribute_universal_commission(uuid, numeric, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_seller_referrer_commission(uuid, uuid, numeric, text) TO authenticated;