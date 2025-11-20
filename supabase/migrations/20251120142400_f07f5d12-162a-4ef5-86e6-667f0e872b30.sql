-- Fix search_path security warnings for multivendor functions

-- Fix can_become_seller function
DROP FUNCTION IF EXISTS can_become_seller(uuid);
CREATE OR REPLACE FUNCTION can_become_seller(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) >= 10
  FROM referrals
  WHERE referrer_id = p_user_id;
$$;

-- Fix distribute_multivendor_commissions function
DROP FUNCTION IF EXISTS distribute_multivendor_commissions(uuid, uuid, uuid, numeric);
CREATE OR REPLACE FUNCTION distribute_multivendor_commissions(
  p_order_id uuid,
  p_buyer_id uuid,
  p_product_id uuid,
  p_final_price numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_wholesale_price numeric;
  v_markup_percentage integer;
  v_markup_amount numeric;
  v_admin_profit numeric;
  v_commission_pool numeric;
BEGIN
  -- Get product seller and pricing info
  SELECT seller_id, wholesale_price, admin_markup_percentage
  INTO v_seller_id, v_wholesale_price, v_markup_percentage
  FROM products
  WHERE id = p_product_id;

  -- Only process if this is a user-created product
  IF v_seller_id IS NOT NULL THEN
    v_markup_amount := p_final_price - v_wholesale_price;
    
    -- If markup is 200% or more, apply 35/65 split
    IF v_markup_percentage >= 200 THEN
      v_admin_profit := v_markup_amount * 0.35;
      v_commission_pool := v_markup_amount * 0.65;
    ELSE
      -- Otherwise, all markup goes to commission pool
      v_commission_pool := v_markup_amount;
      v_admin_profit := 0;
    END IF;

    -- Credit admin profit to a system admin account if exists
    IF v_admin_profit > 0 THEN
      -- Admin profit handling (could be credited to a specific admin wallet)
      INSERT INTO commissions (user_id, from_user_id, amount, commission_type, level, purchase_id)
      SELECT 
        (SELECT id FROM profiles WHERE email = 'admin@system.com' LIMIT 1),
        p_buyer_id,
        v_admin_profit,
        'multivendor_admin_profit',
        0,
        NULL;
    END IF;

    -- Distribute commission pool through existing stair-step and network plans
    -- This integrates with the existing commission distribution
    PERFORM distribute_stair_step_commissions(v_commission_pool, p_buyer_id, false, p_order_id::text);
  END IF;
END;
$$;