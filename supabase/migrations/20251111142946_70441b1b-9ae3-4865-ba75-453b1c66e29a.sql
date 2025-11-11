-- Modify the diamond reward trigger to only award diamonds for logged-in users
-- This ensures guest purchases go directly to admin profit without affiliate commissions

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_credit_diamonds_on_order_completion ON orders;
DROP FUNCTION IF EXISTS credit_diamonds_on_order_completion();

-- Recreate the function with user check
CREATE OR REPLACE FUNCTION credit_diamonds_on_order_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_product_record RECORD;
  v_diamond_reward INTEGER;
BEGIN
  -- Only process if status changed to 'completed' AND user_id is not null (member purchase)
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.user_id IS NOT NULL THEN
    -- Get all products from order items
    FOR v_product_record IN 
      SELECT oi.product_id, oi.quantity, p.diamond_reward
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id AND p.diamond_reward IS NOT NULL AND p.diamond_reward > 0
    LOOP
      -- Calculate total diamonds (product diamond_reward * quantity)
      v_diamond_reward := v_product_record.diamond_reward * v_product_record.quantity;
      
      -- Credit diamonds to user's treasure wallet
      INSERT INTO treasure_wallet (user_id, diamonds, gems)
      VALUES (NEW.user_id, v_diamond_reward, 0)
      ON CONFLICT (user_id)
      DO UPDATE SET diamonds = treasure_wallet.diamonds + v_diamond_reward;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_credit_diamonds_on_order_completion
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION credit_diamonds_on_order_completion();