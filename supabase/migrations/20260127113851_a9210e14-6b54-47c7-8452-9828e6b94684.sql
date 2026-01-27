-- Add is_promotable fields to food_items table for affiliate promotion
ALTER TABLE public.food_items 
ADD COLUMN IF NOT EXISTS is_promotable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS promotable_at timestamptz;

COMMENT ON COLUMN food_items.is_promotable IS 'When true, this food item appears in user dashboards for promotion/sharing';
COMMENT ON COLUMN food_items.commission_tier IS 'Commission tier: standard, high, premium - affects dashboard visibility';
COMMENT ON COLUMN food_items.promotable_at IS 'Timestamp when admin marked this food item as promotable';

-- Create index for efficient querying of promotable food items
CREATE INDEX IF NOT EXISTS idx_food_items_promotable ON food_items(is_promotable) WHERE is_promotable = true;

-- Add is_promotable fields to auctions table for affiliate promotion
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS is_promotable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS promotable_at timestamptz;

COMMENT ON COLUMN auctions.is_promotable IS 'When true, this auction appears in user dashboards for promotion/sharing';
COMMENT ON COLUMN auctions.commission_tier IS 'Commission tier: standard, high, premium - affects dashboard visibility';
COMMENT ON COLUMN auctions.promotable_at IS 'Timestamp when admin marked this auction as promotable';

-- Create index for efficient querying of promotable auctions
CREATE INDEX IF NOT EXISTS idx_auctions_promotable ON auctions(is_promotable) WHERE is_promotable = true;

-- Add is_promotable fields to marketplace_listings table
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS is_promotable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_tier text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS promotable_at timestamptz;

COMMENT ON COLUMN marketplace_listings.is_promotable IS 'When true, this listing appears in user dashboards for promotion/sharing';
COMMENT ON COLUMN marketplace_listings.commission_tier IS 'Commission tier: standard, high, premium - affects dashboard visibility';
COMMENT ON COLUMN marketplace_listings.promotable_at IS 'Timestamp when admin marked this listing as promotable';

-- Create index for efficient querying of promotable marketplace listings
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_promotable ON marketplace_listings(is_promotable) WHERE is_promotable = true;