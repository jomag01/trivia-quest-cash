-- Add stock_quantity column to products table
ALTER TABLE products 
ADD COLUMN stock_quantity INTEGER DEFAULT 0;