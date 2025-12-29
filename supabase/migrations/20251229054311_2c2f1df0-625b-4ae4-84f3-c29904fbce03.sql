-- Add courier and seller tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Add preferred_courier to products for sellers to specify their preferred courier
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preferred_courier text;

-- Create order_status_history table if not exists
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status text NOT NULL,
    notes text,
    updated_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on order_status_history
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Policies for order_status_history
CREATE POLICY "Users can view their order history" ON public.order_status_history
FOR SELECT USING (
    order_id IN (SELECT id FROM public.orders WHERE user_id = auth.uid())
    OR order_id IN (SELECT id FROM public.orders WHERE seller_id = auth.uid())
);

CREATE POLICY "Sellers can insert status history" ON public.order_status_history
FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.orders WHERE seller_id = auth.uid())
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;