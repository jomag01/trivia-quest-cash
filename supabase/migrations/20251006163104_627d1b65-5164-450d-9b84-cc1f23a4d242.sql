-- Add new columns to credit_purchases table
ALTER TABLE public.credit_purchases 
ADD COLUMN IF NOT EXISTS referral_code TEXT,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Update proof_image_url to be nullable since we're removing image uploads
ALTER TABLE public.credit_purchases 
ALTER COLUMN proof_image_url DROP NOT NULL;