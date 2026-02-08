
-- Add new service categories for Hotel, Room Rental, Property Rental
INSERT INTO service_categories (name, icon, description, display_order, is_active, category_type)
VALUES 
  ('Hotel & Staycation', '🏨', 'Hotels, resorts, and staycation rentals', 10, true, 'rental'),
  ('Room Rental', '🛏️', 'Room rentals and shared accommodations', 11, true, 'rental'),
  ('Property Rental', '🏠', 'Houses, apartments, and property rentals', 12, true, 'rental')
ON CONFLICT DO NOTHING;

-- Create booking commission settings table for admin to configure markup percentages per category
CREATE TABLE IF NOT EXISTS public.booking_commission_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT NOT NULL UNIQUE,
  commission_percent NUMERIC NOT NULL DEFAULT 15,
  unilevel_percent NUMERIC NOT NULL DEFAULT 40,
  stairstep_percent NUMERIC NOT NULL DEFAULT 35,
  leadership_percent NUMERIC NOT NULL DEFAULT 25,
  admin_profit_percent NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read booking commission settings"
  ON public.booking_commission_settings FOR SELECT USING (true);

CREATE POLICY "Only admins can modify booking commission settings"
  ON public.booking_commission_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Insert default commission settings for each booking category
INSERT INTO booking_commission_settings (category_name, commission_percent, unilevel_percent, stairstep_percent, leadership_percent, admin_profit_percent)
VALUES
  ('Hotel & Staycation', 15, 40, 35, 25, 0),
  ('Room Rental', 15, 40, 35, 25, 0),
  ('Property Rental', 15, 40, 35, 25, 0),
  ('Travel & Tours', 15, 40, 35, 25, 0),
  ('Beauty & Wellness', 10, 40, 35, 25, 0),
  ('Home Services', 10, 40, 35, 25, 0),
  ('Professional Services', 10, 40, 35, 25, 0)
ON CONFLICT (category_name) DO NOTHING;

-- Add rental-specific columns to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'fixed';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS bathrooms INTEGER;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS area_sqm NUMERIC;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS min_stay_nights INTEGER DEFAULT 1;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS max_guests_rental INTEGER;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS location_address TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS gallery_images TEXT[] DEFAULT '{}';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS check_in_time TEXT DEFAULT '14:00';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS check_out_time TEXT DEFAULT '12:00';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS house_rules TEXT;

-- Create trigger for booking commission on service_bookings status change to 'completed'
CREATE OR REPLACE FUNCTION public.on_booking_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_service RECORD;
  v_commission_setting RECORD;
  v_commission_amount NUMERIC;
  v_referrer_id UUID;
BEGIN
  -- Only fire when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    SELECT * INTO v_service FROM services WHERE id = NEW.service_id;
    
    IF v_service IS NULL THEN
      RETURN NEW;
    END IF;
    
    SELECT * INTO v_commission_setting 
    FROM booking_commission_settings 
    WHERE category_name = v_service.category AND is_active = true;
    
    IF v_commission_setting IS NULL THEN
      v_commission_setting.commission_percent := 15;
    END IF;
    
    v_commission_amount := NEW.total_amount * (v_commission_setting.commission_percent / 100);
    
    v_referrer_id := NEW.referrer_id;
    IF v_referrer_id IS NULL THEN
      SELECT referred_by INTO v_referrer_id FROM profiles WHERE id = NEW.customer_id;
    END IF;
    
    IF v_referrer_id IS NOT NULL AND v_commission_amount > 0 THEN
      PERFORM distribute_universal_commission(
        p_buyer_id := NEW.customer_id,
        p_amount := v_commission_amount,
        p_source_type := 'booking',
        p_source_id := NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_booking_completed ON public.service_bookings;
CREATE TRIGGER trigger_booking_completed
  AFTER UPDATE ON public.service_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.on_booking_completed();
