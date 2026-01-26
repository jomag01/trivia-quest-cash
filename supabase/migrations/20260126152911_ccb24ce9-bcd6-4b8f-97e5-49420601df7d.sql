-- Add is_promotable field for admin to mark products for affiliate promotion
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_promotable boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_tier text DEFAULT 'standard';
ALTER TABLE products ADD COLUMN IF NOT EXISTS promotable_at timestamptz;

COMMENT ON COLUMN products.is_promotable IS 'When true, this product appears in user dashboards for promotion/sharing';
COMMENT ON COLUMN products.commission_tier IS 'Commission tier: standard, high, premium - affects dashboard visibility';
COMMENT ON COLUMN products.promotable_at IS 'Timestamp when admin marked this product as promotable';

-- Create index for efficient querying of promotable products
CREATE INDEX IF NOT EXISTS idx_products_promotable ON products(is_promotable) WHERE is_promotable = true;