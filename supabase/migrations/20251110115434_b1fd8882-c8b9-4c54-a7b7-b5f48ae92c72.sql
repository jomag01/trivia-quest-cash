-- Add diamond reward field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS diamond_reward INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN products.diamond_reward IS 'Number of diamonds awarded when this product is purchased';

-- Create function to credit diamonds on order completion
CREATE OR REPLACE FUNCTION credit_diamonds_on_order_completion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  total_diamonds INTEGER := 0;
  order_item RECORD;
BEGIN
  -- Only process when order status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Calculate total diamonds from all items in the order
    FOR order_item IN 
      SELECT oi.quantity, p.diamond_reward
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
    LOOP
      total_diamonds := total_diamonds + (order_item.quantity * COALESCE(order_item.diamond_reward, 0));
    END LOOP;
    
    -- Credit diamonds to user's treasure wallet if any diamonds earned
    IF total_diamonds > 0 THEN
      INSERT INTO treasure_wallet (user_id, diamonds)
      VALUES (NEW.user_id, total_diamonds)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        diamonds = treasure_wallet.diamonds + total_diamonds,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_credit_diamonds_on_order_completion ON orders;
CREATE TRIGGER trigger_credit_diamonds_on_order_completion
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION credit_diamonds_on_order_completion();