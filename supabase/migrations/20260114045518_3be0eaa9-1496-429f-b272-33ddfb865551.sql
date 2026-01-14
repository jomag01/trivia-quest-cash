-- Add table occupation settings to food_vendors
ALTER TABLE public.food_vendors 
ADD COLUMN IF NOT EXISTS default_table_duration_hours DECIMAL(3,1) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS hourly_extension_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS allow_waitlist BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS waitlist_buffer_minutes INTEGER DEFAULT 60;

-- Add extended booking fields to restaurant_reservations
ALTER TABLE public.restaurant_reservations
ADD COLUMN IF NOT EXISTS booked_hours INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS extension_fee_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_end_time TIME;

-- Add occupation status to restaurant_tables for real-time tracking
ALTER TABLE public.restaurant_tables
ADD COLUMN IF NOT EXISTS current_reservation_id UUID REFERENCES public.restaurant_reservations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS occupied_since TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS expected_vacant_at TIMESTAMPTZ;

COMMENT ON COLUMN public.food_vendors.default_table_duration_hours IS 'Default hours a customer can use a table';
COMMENT ON COLUMN public.food_vendors.hourly_extension_fee IS 'Fee per additional hour of table use';
COMMENT ON COLUMN public.food_vendors.allow_waitlist IS 'Allow customers to join waitlist when all tables are occupied';
COMMENT ON COLUMN public.food_vendors.waitlist_buffer_minutes IS 'Minimum wait time before a waitlisted reservation can start';