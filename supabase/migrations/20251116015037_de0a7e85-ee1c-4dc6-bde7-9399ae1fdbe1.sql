-- Create order_items table if not exists
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  diamond_reward INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for order_items
CREATE POLICY "Users can view their own order items"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view all order items"
ON public.order_items FOR SELECT
USING (true);

CREATE POLICY "System can insert order items"
ON public.order_items FOR INSERT
WITH CHECK (true);

-- Add total_diamond_credits to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total_diamond_credits INTEGER DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Update the credit_diamonds_on_delivery function to handle multiple order items
CREATE OR REPLACE FUNCTION credit_diamonds_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_total_diamonds INTEGER;
  v_item RECORD;
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
      INSERT INTO treasure_wallet (id, balance, total_earned)
      VALUES (v_user_id, v_total_diamonds, v_total_diamonds)
      ON CONFLICT (id) 
      DO UPDATE SET 
        balance = treasure_wallet.balance + v_total_diamonds,
        total_earned = treasure_wallet.total_earned + v_total_diamonds;
      
      -- Log the transaction
      INSERT INTO diamond_transactions (user_id, amount, type, description, reference_id)
      VALUES (v_user_id, v_total_diamonds, 'credit', 'Diamond reward from order #' || NEW.order_number, NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;