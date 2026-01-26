-- Add impression allocation columns to sponsored_products
ALTER TABLE public.sponsored_products 
ADD COLUMN IF NOT EXISTS impressions_allocated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS impressions_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_impression NUMERIC DEFAULT 0.10,
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'delivering';

-- Create function to calculate and allocate impressions when ad is approved/activated
CREATE OR REPLACE FUNCTION public.allocate_impressions_on_activation()
RETURNS TRIGGER AS $$
DECLARE
  admin_cpi NUMERIC;
BEGIN
  -- Get admin-set cost per impression from settings (default 0.10)
  SELECT COALESCE((setting_value::NUMERIC), 0.10) INTO admin_cpi
  FROM public.advanced_ad_settings 
  WHERE setting_key = 'cost_per_impression' AND is_active = true
  LIMIT 1;
  
  IF admin_cpi IS NULL OR admin_cpi <= 0 THEN
    admin_cpi := 0.10;
  END IF;
  
  -- When status changes to active, calculate impressions based on budget
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    NEW.cost_per_impression := admin_cpi;
    NEW.impressions_allocated := FLOOR(NEW.total_budget / admin_cpi);
    NEW.impressions_remaining := NEW.impressions_allocated;
    NEW.delivery_status := 'delivering';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for impression allocation
DROP TRIGGER IF EXISTS trigger_allocate_impressions ON public.sponsored_products;
CREATE TRIGGER trigger_allocate_impressions
  BEFORE UPDATE ON public.sponsored_products
  FOR EACH ROW
  EXECUTE FUNCTION public.allocate_impressions_on_activation();

-- Add cost_per_impression to advanced_ad_settings if not exists
INSERT INTO public.advanced_ad_settings (setting_key, setting_value, setting_type, description, is_active)
VALUES ('cost_per_impression', '0.10', 'number', 'Cost per impression in PHP - determines how many impressions per budget', true)
ON CONFLICT (setting_key) DO NOTHING;