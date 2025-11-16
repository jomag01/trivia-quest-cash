-- Fix the credit_diamonds_on_delivery function to use correct column names
CREATE OR REPLACE FUNCTION credit_diamonds_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_total_diamonds INTEGER;
  v_item RECORD;
  v_current_diamonds INTEGER;
BEGIN
  -- Only proceed if status changed to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    v_user_id := NEW.user_id;
    
    -- Skip if no user_id (guest order)
    IF v_user_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_total_diamonds := 0;
    
    -- Calculate total diamonds from all order items
    FOR v_item IN 
      SELECT oi.quantity, p.diamond_reward
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
    LOOP
      v_total_diamonds := v_total_diamonds + (COALESCE(v_item.diamond_reward, 0) * v_item.quantity);
    END LOOP;
    
    -- Update total_diamond_credits in order
    UPDATE orders 
    SET total_diamond_credits = v_total_diamonds 
    WHERE id = NEW.id;
    
    -- Credit diamonds to user's treasure wallet if there are diamonds to credit
    IF v_total_diamonds > 0 THEN
      -- Get current diamonds
      SELECT diamonds INTO v_current_diamonds
      FROM treasure_wallet
      WHERE id = v_user_id;
      
      -- Insert or update treasure wallet
      INSERT INTO treasure_wallet (id, user_id, diamonds, gems)
      VALUES (v_user_id, v_user_id, v_total_diamonds, 0)
      ON CONFLICT (id) 
      DO UPDATE SET 
        diamonds = treasure_wallet.diamonds + v_total_diamonds;
      
      -- Log the transaction
      INSERT INTO diamond_transactions (user_id, amount, type, description, reference_id)
      VALUES (v_user_id, v_total_diamonds, 'credit', 'Diamond reward from order #' || NEW.order_number, NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;