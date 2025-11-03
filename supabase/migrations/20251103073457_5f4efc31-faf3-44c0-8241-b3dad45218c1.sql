-- Fix search_path for the update function
DROP TRIGGER IF EXISTS trigger_update_product_categories_updated_at ON public.product_categories;
DROP FUNCTION IF EXISTS update_product_categories_updated_at();

CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_product_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW
EXECUTE FUNCTION update_product_categories_updated_at();