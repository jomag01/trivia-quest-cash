-- Fix the commissions check constraint to include all used commission types
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_commission_type_check;

ALTER TABLE public.commissions ADD CONSTRAINT commissions_commission_type_check 
CHECK (commission_type IN (
  'purchase_commission', 
  'level_bonus', 
  'signup_commission',
  'unilevel_commission',
  'stairstep_commission',
  'stair_step_cash',
  'leadership_commission',
  'network_commission',
  'product_commission',
  'food_commission',
  'service_commission',
  'seller_referral',
  'ad_commission',
  'binary_commission',
  'referral_commission'
));