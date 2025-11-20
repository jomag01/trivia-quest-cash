-- Fix remaining search_path warnings for triggers

-- Fix calculate_product_final_price function
DROP FUNCTION IF EXISTS calculate_product_final_price() CASCADE;
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

-- Recreate trigger
CREATE TRIGGER calculate_final_price_trigger
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION calculate_product_final_price();

-- Fix update_seller_rating function
DROP FUNCTION IF EXISTS update_seller_rating() CASCADE;
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

-- Recreate trigger
CREATE TRIGGER update_seller_rating_trigger
AFTER INSERT OR UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_seller_rating();