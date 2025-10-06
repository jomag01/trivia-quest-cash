-- Add is_draft column to shop_items table
ALTER TABLE public.shop_items
ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT false;

-- Add index for filtering drafts
CREATE INDEX idx_shop_items_is_draft ON public.shop_items(is_draft);