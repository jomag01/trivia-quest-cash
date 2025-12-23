-- Add email verification and business document fields to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_code text,
ADD COLUMN IF NOT EXISTS verification_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS business_permit_url text,
ADD COLUMN IF NOT EXISTS bir_url text,
ADD COLUMN IF NOT EXISTS dti_url text;