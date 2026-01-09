-- Add opening/closing times and banner to food_vendors (if not already added)
ALTER TABLE public.food_vendors 
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS opening_time TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS closing_time TIME DEFAULT '22:00:00';

-- Create restaurant_reservations table
CREATE TABLE IF NOT EXISTS public.restaurant_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  customer_id UUID,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  table_number TEXT,
  special_requests TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'arrived', 'completed', 'no_show')),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on restaurant_reservations
ALTER TABLE public.restaurant_reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Customers can manage their reservations" ON public.restaurant_reservations;
DROP POLICY IF EXISTS "Vendors can manage restaurant reservations" ON public.restaurant_reservations;

-- Policy for customers to manage their reservations
CREATE POLICY "Customers can manage their reservations"
ON public.restaurant_reservations
FOR ALL
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

-- Policy for vendors to view and update reservations
CREATE POLICY "Vendors can manage restaurant reservations"
ON public.restaurant_reservations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.food_vendors fv
    WHERE fv.id = restaurant_reservations.vendor_id
    AND fv.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.food_vendors fv
    WHERE fv.id = restaurant_reservations.vendor_id
    AND fv.owner_id = auth.uid()
  )
);

-- Create reservation_slots table for configuring available time slots
CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER DEFAULT 20,
  slot_duration_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(vendor_id, day_of_week, start_time)
);

-- Enable RLS on reservation_slots
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Vendors can manage their reservation slots" ON public.reservation_slots;
DROP POLICY IF EXISTS "Anyone can view active reservation slots" ON public.reservation_slots;

-- Policy for vendors to manage their slots
CREATE POLICY "Vendors can manage their reservation slots"
ON public.reservation_slots
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.food_vendors fv
    WHERE fv.id = reservation_slots.vendor_id
    AND fv.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.food_vendors fv
    WHERE fv.id = reservation_slots.vendor_id
    AND fv.owner_id = auth.uid()
  )
);

-- Policy for public to view active slots
CREATE POLICY "Anyone can view active reservation slots"
ON public.reservation_slots
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at on new tables (drop first if exists)
DROP TRIGGER IF EXISTS update_restaurant_reservations_updated_at ON public.restaurant_reservations;

CREATE TRIGGER update_restaurant_reservations_updated_at
BEFORE UPDATE ON public.restaurant_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();