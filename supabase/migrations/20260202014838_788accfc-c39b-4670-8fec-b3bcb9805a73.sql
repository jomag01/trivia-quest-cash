-- Add travel booking downpayment columns to service_bookings
ALTER TABLE public.service_bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS downpayment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS downpayment_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS full_payment_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS full_payment_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS number_of_guests INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS check_in_date DATE,
ADD COLUMN IF NOT EXISTS check_out_date DATE,
ADD COLUMN IF NOT EXISTS room_type TEXT,
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS guest_names JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'standard';

-- Create travel_booking_settings table for admin configurable downpayment
CREATE TABLE IF NOT EXISTS public.travel_booking_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  setting_type TEXT DEFAULT 'text',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_booking_settings ENABLE ROW LEVEL SECURITY;

-- Admin read/write access
CREATE POLICY "Admin can manage travel settings"
  ON public.travel_booking_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Everyone can read settings
CREATE POLICY "Everyone can read travel settings"
  ON public.travel_booking_settings
  FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.travel_booking_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('downpayment_percentage', '30', 'number', 'Downpayment percentage required for confirmed booking'),
  ('downpayment_enabled', 'true', 'boolean', 'Enable downpayment requirement for travel bookings'),
  ('min_days_advance_booking', '1', 'number', 'Minimum days in advance to book'),
  ('max_guests_per_booking', '10', 'number', 'Maximum guests allowed per booking'),
  ('cancellation_policy_hours', '24', 'number', 'Hours before booking to allow free cancellation'),
  ('refund_percentage_late_cancel', '50', 'number', 'Refund percentage for late cancellation')
ON CONFLICT (setting_key) DO NOTHING;

-- Add travel packages table for Booking.com style listings
CREATE TABLE IF NOT EXISTS public.travel_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  package_name TEXT NOT NULL,
  package_type TEXT DEFAULT 'tour',
  destination TEXT NOT NULL,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '12:00',
  price_per_night NUMERIC DEFAULT 0,
  price_per_person NUMERIC DEFAULT 0,
  min_nights INTEGER DEFAULT 1,
  max_nights INTEGER DEFAULT 30,
  min_guests INTEGER DEFAULT 1,
  max_guests INTEGER DEFAULT 10,
  amenities JSONB DEFAULT '[]'::jsonb,
  inclusions JSONB DEFAULT '[]'::jsonb,
  exclusions JSONB DEFAULT '[]'::jsonb,
  policies JSONB DEFAULT '{}'::jsonb,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  rating_average NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on travel_packages
ALTER TABLE public.travel_packages ENABLE ROW LEVEL SECURITY;

-- Everyone can view active travel packages
CREATE POLICY "Anyone can view active travel packages"
  ON public.travel_packages
  FOR SELECT
  USING (is_active = true);

-- Providers can manage their own packages
CREATE POLICY "Providers can manage their packages"
  ON public.travel_packages
  FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Create travel availability table
CREATE TABLE IF NOT EXISTS public.travel_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID REFERENCES travel_packages(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  available_slots INTEGER DEFAULT 10,
  booked_slots INTEGER DEFAULT 0,
  price_override NUMERIC,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.travel_availability ENABLE ROW LEVEL SECURITY;

-- Anyone can read availability
CREATE POLICY "Anyone can read availability"
  ON public.travel_availability
  FOR SELECT
  USING (true);

-- Providers can manage their availability
CREATE POLICY "Providers can manage availability"
  ON public.travel_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM travel_packages WHERE id = package_id AND provider_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_travel_packages_destination ON public.travel_packages(destination);
CREATE INDEX IF NOT EXISTS idx_travel_packages_provider ON public.travel_packages(provider_id);
CREATE INDEX IF NOT EXISTS idx_travel_availability_date ON public.travel_availability(available_date);
CREATE INDEX IF NOT EXISTS idx_service_bookings_payment ON public.service_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_service_bookings_type ON public.service_bookings(booking_type);