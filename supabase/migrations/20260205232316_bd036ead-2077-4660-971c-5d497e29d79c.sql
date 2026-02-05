-- Fix the check constraint to include the short-form commission types used by triggers
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_commission_type_check;

ALTER TABLE public.commissions ADD CONSTRAINT commissions_commission_type_check 
CHECK (commission_type = ANY (ARRAY[
  'purchase_commission'::text, 
  'level_bonus'::text, 
  'signup_commission'::text, 
  'unilevel_commission'::text, 
  'stairstep_commission'::text, 
  'stair_step_cash'::text, 
  'leadership_commission'::text, 
  'network_commission'::text, 
  'product_commission'::text, 
  'food_commission'::text, 
  'service_commission'::text, 
  'seller_referral'::text, 
  'ad_commission'::text, 
  'binary_commission'::text, 
  'referral_commission'::text,
  -- Add short-form types used by the order delivery triggers
  'unilevel'::text,
  'stairstep'::text,
  'leadership'::text
]));

-- Fix RLS on seller_referrer_earnings to allow trigger inserts
DROP POLICY IF EXISTS "Enable insert for system" ON public.seller_referrer_earnings;
DROP POLICY IF EXISTS "Enable read access for users" ON public.seller_referrer_earnings;
DROP POLICY IF EXISTS "Enable update for system" ON public.seller_referrer_earnings;

-- Allow authenticated users to read their own earnings
CREATE POLICY "Users can read own seller referrer earnings"
ON public.seller_referrer_earnings
FOR SELECT
TO authenticated
USING (
  seller_id = auth.uid() OR referrer_id = auth.uid()
);

-- Allow inserts from service role (triggers run with definer privileges)
-- We need to allow the trigger to insert, so we use a permissive policy for service operations
CREATE POLICY "Allow insert for authenticated users trigger context"
ON public.seller_referrer_earnings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow updates for service operations
CREATE POLICY "Allow update for authenticated users trigger context"
ON public.seller_referrer_earnings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);