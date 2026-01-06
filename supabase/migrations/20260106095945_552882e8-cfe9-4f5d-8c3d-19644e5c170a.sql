-- Add deferred_plan_type column to binary_network for tracking plan type of deferred members
ALTER TABLE public.binary_network 
  ADD COLUMN IF NOT EXISTS deferred_plan_type TEXT DEFAULT 'monthly' CHECK (deferred_plan_type IN ('monthly', 'biannual', 'yearly'));

-- Update existing deferred members to have a plan type based on their deferred amount
UPDATE public.binary_network 
SET deferred_plan_type = CASE 
  WHEN deferred_amount >= 11990 THEN 'yearly'
  WHEN deferred_amount >= 6990 THEN 'biannual'
  ELSE 'monthly'
END
WHERE has_deferred_payment = true;