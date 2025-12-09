-- Drop old constraint and add new one with all commission types
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_commission_type_check;

ALTER TABLE public.commissions ADD CONSTRAINT commissions_commission_type_check 
CHECK (commission_type IN (
  'purchase_commission', 
  'level_bonus', 
  'signup_commission',
  'unilevel_commission',
  'stairstep_commission',
  'leadership_commission',
  'network_commission',
  'product_commission',
  'food_commission',
  'service_commission'
));