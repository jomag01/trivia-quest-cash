-- Add shipping-related columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC,
ADD COLUMN IF NOT EXISTS dimensions_cm TEXT,
ADD COLUMN IF NOT EXISTS free_shipping BOOLEAN DEFAULT false;