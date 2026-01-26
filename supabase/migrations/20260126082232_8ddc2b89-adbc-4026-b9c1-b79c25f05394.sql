-- Add account_type to profiles for tracking user role preference during registration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'buyer';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

-- Function to auto-create courier_rider and delivery_rider entries when account_type is 'rider'
CREATE OR REPLACE FUNCTION public.sync_rider_on_profile_update()
RETURNS TRIGGER AS $$
DECLARE
  rider_code TEXT;
BEGIN
  -- Only process if account_type is 'rider'
  IF NEW.account_type = 'rider' THEN
    -- Generate unique rider code
    rider_code := 'RDR-' || UPPER(SUBSTRING(MD5(NEW.id::text) FROM 1 FOR 8));
    
    -- Insert into courier_riders if not exists
    INSERT INTO public.courier_riders (user_id, rider_code, vehicle_type, is_available)
    VALUES (NEW.id, rider_code, 'motorcycle', false)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Insert into delivery_riders (food delivery) if not exists
    INSERT INTO public.delivery_riders (user_id, vehicle_type, status)
    VALUES (NEW.id, 'motorcycle', 'pending')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for syncing riders
DROP TRIGGER IF EXISTS sync_rider_on_profile_change ON public.profiles;
CREATE TRIGGER sync_rider_on_profile_change
  AFTER INSERT OR UPDATE OF account_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_rider_on_profile_update();

-- Add proof_of_delivery columns to courier_rider_jobs
ALTER TABLE public.courier_rider_jobs ADD COLUMN IF NOT EXISTS proof_photo_url TEXT;
ALTER TABLE public.courier_rider_jobs ADD COLUMN IF NOT EXISTS scanned_at TIMESTAMPTZ;
ALTER TABLE public.courier_rider_jobs ADD COLUMN IF NOT EXISTS scan_type TEXT; -- 'pickup', 'delivery'