-- Add referral commission field to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS referral_commission_diamonds integer DEFAULT 0;

COMMENT ON COLUMN products.referral_commission_diamonds IS 'Diamond commission earned by referrer when someone buys through their product share link';

-- Create product_referrals table to track product sharing
CREATE TABLE IF NOT EXISTS product_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  referred_user_id uuid,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  commission_diamonds integer NOT NULL DEFAULT 0,
  commission_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  purchased_at timestamptz,
  
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE product_referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own referrals
CREATE POLICY "Users can view own product referrals"
  ON product_referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Policy: System can insert referrals
CREATE POLICY "System can insert product referrals"
  ON product_referrals FOR INSERT
  WITH CHECK (true);

-- Policy: System can update referrals
CREATE POLICY "System can update product referrals"
  ON product_referrals FOR UPDATE
  USING (true);

-- Add referral tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_referrer_id uuid;

COMMENT ON COLUMN orders.product_referrer_id IS 'User who referred this purchase via product share link';

-- Function to award referral commission on delivery
CREATE OR REPLACE FUNCTION award_product_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referral RECORD;
BEGIN
  -- Only process when order status changes to delivered
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') AND NEW.product_referrer_id IS NOT NULL THEN
    
    -- Get the referral record
    SELECT pr.*, p.referral_commission_diamonds
    INTO v_referral
    FROM product_referrals pr
    JOIN products p ON p.id = pr.product_id
    WHERE pr.order_id = NEW.id
    AND pr.commission_paid = false
    LIMIT 1;
    
    IF FOUND AND v_referral.referral_commission_diamonds > 0 THEN
      -- Award diamonds to referrer
      INSERT INTO treasure_wallet (user_id, diamonds, gems)
      VALUES (v_referral.referrer_id, v_referral.referral_commission_diamonds, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        diamonds = treasure_wallet.diamonds + v_referral.referral_commission_diamonds,
        updated_at = now();
      
      -- Mark commission as paid
      UPDATE product_referrals
      SET commission_paid = true
      WHERE id = v_referral.id;
      
      -- Create notification
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (
        v_referral.referrer_id,
        'Referral Commission Earned!',
        format('You earned %s diamonds from a product referral!', v_referral.referral_commission_diamonds),
        'commission'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for referral commission
DROP TRIGGER IF EXISTS award_product_referral_on_delivery ON orders;
CREATE TRIGGER award_product_referral_on_delivery
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION award_product_referral_commission();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_referrals_referrer ON product_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_product_referrals_product ON product_referrals(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_product_referrer ON orders(product_referrer_id);