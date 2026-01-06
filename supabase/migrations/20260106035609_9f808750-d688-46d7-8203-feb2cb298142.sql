-- Drop the foreign key constraint that's causing the issue
-- The commissions table has purchase_id that references credit_purchases(id)
-- but the triggers are passing order IDs to this field
-- Since we have a separate related_order_id column for orders, 
-- we should either remove the constraint or make purchase_id nullable without FK

-- Remove the foreign key constraint on purchase_id
ALTER TABLE public.commissions DROP CONSTRAINT IF EXISTS commissions_purchase_id_fkey;

-- Add a comment explaining the change
COMMENT ON COLUMN public.commissions.purchase_id IS 'Legacy field - use related_order_id for order-based commissions';