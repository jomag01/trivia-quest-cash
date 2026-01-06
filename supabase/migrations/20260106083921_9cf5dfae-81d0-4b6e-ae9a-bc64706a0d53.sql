-- Add 6-month plan support to ai_subscriptions
ALTER TABLE public.ai_subscriptions 
  DROP CONSTRAINT IF EXISTS ai_subscriptions_plan_type_check;
  
ALTER TABLE public.ai_subscriptions
  ADD CONSTRAINT ai_subscriptions_plan_type_check 
  CHECK (plan_type IN ('monthly', 'biannual', 'yearly'));

-- Create AI Beehives tiers table for flexible tier management
CREATE TABLE IF NOT EXISTS public.beehive_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'biannual', 'yearly')),
  price NUMERIC NOT NULL DEFAULT 0,
  credits_included INTEGER NOT NULL DEFAULT 0,
  binary_volume NUMERIC NOT NULL DEFAULT 0,
  daily_cap NUMERIC NOT NULL DEFAULT 5000,
  cycle_volume NUMERIC NOT NULL DEFAULT 11960,
  cycle_commission_percent NUMERIC NOT NULL DEFAULT 10,
  left_volume_required NUMERIC NOT NULL DEFAULT 11960,
  right_volume_required NUMERIC NOT NULL DEFAULT 11960,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beehive_tiers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read tiers
CREATE POLICY "Anyone can read beehive tiers" ON public.beehive_tiers
  FOR SELECT USING (true);

-- Insert default tiers
INSERT INTO public.beehive_tiers (tier_name, plan_type, price, credits_included, binary_volume, daily_cap, cycle_volume, display_order)
VALUES 
  ('Starter Monthly', 'monthly', 1390, 500, 1390, 5000, 11960, 1),
  ('Pro 6-Month', 'biannual', 6990, 3500, 6990, 15000, 11960, 2),
  ('Elite Yearly', 'yearly', 11990, 8000, 11990, 50000, 11960, 3);

-- Update ai_monthly_restrictions to support per-plan visibility
ALTER TABLE public.ai_monthly_restrictions 
  ADD COLUMN IF NOT EXISTS hidden_for_monthly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_for_biannual BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_for_yearly BOOLEAN DEFAULT false;

-- Migrate existing is_hidden to hidden_for_monthly
UPDATE public.ai_monthly_restrictions 
  SET hidden_for_monthly = is_hidden 
  WHERE hidden_for_monthly IS NULL OR hidden_for_monthly = false;

-- Create beehive volume rules table
CREATE TABLE IF NOT EXISTS public.beehive_volume_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_id UUID REFERENCES public.beehive_tiers(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  left_volume_min NUMERIC NOT NULL DEFAULT 0,
  right_volume_min NUMERIC NOT NULL DEFAULT 0,
  commission_multiplier NUMERIC NOT NULL DEFAULT 1,
  max_daily_cycles INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beehive_volume_rules ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read volume rules
CREATE POLICY "Anyone can read volume rules" ON public.beehive_volume_rules
  FOR SELECT USING (true);

-- Enable realtime for beehive_tiers
ALTER PUBLICATION supabase_realtime ADD TABLE public.beehive_tiers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.beehive_volume_rules;