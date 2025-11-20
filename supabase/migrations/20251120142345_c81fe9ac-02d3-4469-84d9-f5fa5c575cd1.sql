-- Add multivendor marketplace schema

-- Add seller and markup fields to products table
ALTER TABLE products ADD COLUMN seller_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN admin_markup_percentage integer DEFAULT 0 CHECK (admin_markup_percentage >= 0 AND admin_markup_percentage <= 200);
ALTER TABLE products ADD COLUMN wholesale_price numeric(10,2);
ALTER TABLE products ADD COLUMN final_price numeric(10,2);

-- Add seller verification to profiles
ALTER TABLE profiles ADD COLUMN is_verified_seller boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN seller_rating numeric(3,2) DEFAULT 0.00;
ALTER TABLE profiles ADD COLUMN total_reviews integer DEFAULT 0;

-- Create seller verification requests table
CREATE TABLE seller_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid REFERENCES profiles(id),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, status)
);

-- Create product reviews table
CREATE TABLE product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  product_rating integer NOT NULL CHECK (product_rating >= 1 AND product_rating <= 5),
  seller_rating integer CHECK (seller_rating >= 1 AND seller_rating <= 5),
  review_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(order_id, product_id, buyer_id)
);

-- Enable RLS
ALTER TABLE seller_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_verification_requests
CREATE POLICY "Users can view their own verification requests"
  ON seller_verification_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests"
  ON seller_verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification requests"
  ON seller_verification_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verification requests"
  ON seller_verification_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for product_reviews
CREATE POLICY "Anyone can view reviews"
  ON product_reviews FOR SELECT
  USING (true);

CREATE POLICY "Buyers can create reviews for their orders"
  ON product_reviews FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own reviews"
  ON product_reviews FOR UPDATE
  USING (auth.uid() = buyer_id);

CREATE POLICY "Admins can delete reviews"
  ON product_reviews FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to check if user has 10+ referrals
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

-- Function to calculate final price with markup
CREATE OR REPLACE FUNCTION calculate_product_final_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL AND NEW.wholesale_price IS NOT NULL THEN
    -- User-created product: calculate final price based on wholesale + markup
    NEW.final_price := NEW.wholesale_price * (1 + (NEW.admin_markup_percentage::numeric / 100));
    NEW.base_price := NEW.final_price; -- Sync base_price for compatibility
  ELSE
    -- Admin product: use base_price
    NEW.final_price := COALESCE(NEW.promo_price, NEW.base_price);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-calculate final price
CREATE TRIGGER calculate_final_price_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_product_final_price();

-- Function to update seller rating
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.seller_id IS NOT NULL AND NEW.seller_rating IS NOT NULL THEN
    UPDATE profiles
    SET 
      seller_rating = (
        SELECT AVG(seller_rating)::numeric(3,2)
        FROM product_reviews
        WHERE seller_id = NEW.seller_id AND seller_rating IS NOT NULL
      ),
      total_reviews = (
        SELECT COUNT(*)
        FROM product_reviews
        WHERE seller_id = NEW.seller_id
      )
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to update seller rating on new review
CREATE TRIGGER update_seller_rating_trigger
AFTER INSERT OR UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_seller_rating();

-- Update commission distribution to handle admin profit split
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