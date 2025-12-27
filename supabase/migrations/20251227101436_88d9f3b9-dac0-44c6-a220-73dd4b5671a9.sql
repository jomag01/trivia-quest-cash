-- Add columns to track deferred binary payment
ALTER TABLE binary_network ADD COLUMN IF NOT EXISTS has_deferred_payment BOOLEAN DEFAULT FALSE;
ALTER TABLE binary_network ADD COLUMN IF NOT EXISTS deferred_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE binary_network ADD COLUMN IF NOT EXISTS deferred_paid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE binary_network ADD COLUMN IF NOT EXISTS admin_activated BOOLEAN DEFAULT FALSE;
ALTER TABLE binary_network ADD COLUMN IF NOT EXISTS admin_activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE binary_network ADD COLUMN IF NOT EXISTS admin_activated_by UUID;

-- Add is_admin_fixed column to affiliate_current_rank for admin-activated affiliates
ALTER TABLE affiliate_current_rank ADD COLUMN IF NOT EXISTS admin_activated BOOLEAN DEFAULT FALSE;
ALTER TABLE affiliate_current_rank ADD COLUMN IF NOT EXISTS admin_activated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE affiliate_current_rank ADD COLUMN IF NOT EXISTS admin_activated_by UUID;