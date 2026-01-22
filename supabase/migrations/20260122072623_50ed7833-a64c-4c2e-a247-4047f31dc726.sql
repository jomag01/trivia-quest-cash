-- Add allocation percentage columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stairstep_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS leadership_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS admin_net_profit_percentage numeric DEFAULT 0;

-- Create beesmate_subscription_payments table for tracking payment distributions
CREATE TABLE IF NOT EXISTS public.beesmate_subscription_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID,
  plan_type TEXT NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  admin_profit NUMERIC NOT NULL DEFAULT 0,
  unilevel_pool NUMERIC NOT NULL DEFAULT 0,
  stairstep_pool NUMERIC NOT NULL DEFAULT 0,
  leadership_pool NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beesmate_subscription_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can view all subscription payments
CREATE POLICY "Admins can view all subscription payments"
ON public.beesmate_subscription_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- RLS Policy: Users can view their own subscription payments
CREATE POLICY "Users can view their own subscription payments"
ON public.beesmate_subscription_payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Admin can insert subscription payments
CREATE POLICY "Admins can insert subscription payments"
ON public.beesmate_subscription_payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.beesmate_subscription_payments;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_beesmate_payments_user ON public.beesmate_subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_beesmate_payments_created ON public.beesmate_subscription_payments(created_at DESC);