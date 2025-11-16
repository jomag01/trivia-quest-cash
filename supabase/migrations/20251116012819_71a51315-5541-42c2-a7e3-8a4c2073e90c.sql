-- Fix search path for credit_diamonds_on_delivery function
CREATE OR REPLACE FUNCTION credit_diamonds_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_total_diamonds integer;
  v_item RECORD;
BEGIN
  -- Only process when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_user_id := NEW.user_id;
    v_total_diamonds := 0;
    
    -- Calculate total diamonds from all order items
    FOR v_item IN 
      SELECT oi.quantity, p.diamond_reward
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id AND p.diamond_reward IS NOT NULL
    LOOP
      v_total_diamonds := v_total_diamonds + (v_item.quantity * v_item.diamond_reward);
    END LOOP;
    
    -- Credit diamonds if there are any to credit
    IF v_total_diamonds > 0 THEN
      -- Insert or update treasure_wallet
      INSERT INTO treasure_wallet (user_id, diamonds)
      VALUES (v_user_id, v_total_diamonds)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        diamonds = treasure_wallet.diamonds + v_total_diamonds,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';