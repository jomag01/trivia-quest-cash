-- Create rider payouts table for tracking rider earnings payouts
CREATE TABLE IF NOT EXISTS public.courier_rider_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.courier_riders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  bank TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courier_rider_payouts ENABLE ROW LEVEL SECURITY;

-- Riders can view their own payouts
CREATE POLICY "Riders can view own payouts"
  ON public.courier_rider_payouts
  FOR SELECT
  USING (
    rider_id IN (
      SELECT id FROM public.courier_riders WHERE user_id = auth.uid()
    )
  );

-- Riders can insert their own payout requests
CREATE POLICY "Riders can request payouts"
  ON public.courier_rider_payouts
  FOR INSERT
  WITH CHECK (
    rider_id IN (
      SELECT id FROM public.courier_riders WHERE user_id = auth.uid()
    )
  );

-- Admins can view all payouts
CREATE POLICY "Admins can view all payouts"
  ON public.courier_rider_payouts
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update payouts
CREATE POLICY "Admins can update payouts"
  ON public.courier_rider_payouts
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_courier_rider_payouts_rider_id ON public.courier_rider_payouts(rider_id);
CREATE INDEX IF NOT EXISTS idx_courier_rider_payouts_status ON public.courier_rider_payouts(status);

-- Add is_active column to courier_riders if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courier_riders' AND column_name = 'is_active') THEN
    ALTER TABLE public.courier_riders ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;