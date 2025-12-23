-- Fix the function search path for the trigger function
CREATE OR REPLACE FUNCTION public.update_retailer_tables_updated_at()
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