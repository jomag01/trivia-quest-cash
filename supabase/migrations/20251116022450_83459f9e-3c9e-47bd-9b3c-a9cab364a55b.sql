-- Add payment_method to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add is_verified to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create function to auto-verify user after first successful paid order
CREATE OR REPLACE FUNCTION verify_user_on_first_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify user if this is their first completed order with non-COD payment
  IF NEW.status = 'delivered' AND NEW.payment_method IN ('gcash', 'bank_transfer', 'credits', 'diamonds') THEN
    UPDATE profiles 
    SET is_verified = TRUE 
    WHERE id = NEW.user_id AND is_verified = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to verify users
DROP TRIGGER IF EXISTS verify_user_trigger ON orders;
CREATE TRIGGER verify_user_trigger
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION verify_user_on_first_order();

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_method IS 'Payment method used: cod, gcash, bank_transfer, credits, diamonds';