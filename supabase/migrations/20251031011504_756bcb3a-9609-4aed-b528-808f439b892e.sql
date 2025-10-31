-- Add receiver information columns to credit_purchases table
ALTER TABLE credit_purchases 
ADD COLUMN IF NOT EXISTS receiver_name TEXT,
ADD COLUMN IF NOT EXISTS receiver_account TEXT;