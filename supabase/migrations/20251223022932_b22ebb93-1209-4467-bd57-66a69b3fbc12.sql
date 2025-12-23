-- Fix function search path for update_supplier_updated_at
CREATE OR REPLACE FUNCTION public.update_supplier_updated_at()
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

-- Fix function search path for calculate_supplier_product_price
CREATE OR REPLACE FUNCTION public.calculate_supplier_product_price()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.final_price = NEW.supplier_price + (NEW.supplier_price * COALESCE(NEW.admin_markup_percent, 0) / 100) + COALESCE(NEW.admin_markup_fixed, 0);
    RETURN NEW;
END;
$$;