-- Add item_name column to food_order_items to store item name with customizations
ALTER TABLE public.food_order_items 
ADD COLUMN IF NOT EXISTS item_name TEXT;