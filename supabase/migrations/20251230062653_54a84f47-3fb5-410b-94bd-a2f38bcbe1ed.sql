-- Add auction commission settings to auction_settings table
INSERT INTO public.auction_settings (setting_key, setting_value) VALUES
  ('platform_success_fee_percent', '5'),
  ('direct_referrer_commission_percent', '3'),
  ('unilevel_commission_percent', '40'),
  ('stairstep_commission_percent', '35'),
  ('leadership_commission_percent', '25')
ON CONFLICT (setting_key) DO NOTHING;

-- Create auction_commissions table to track commission payouts
CREATE TABLE IF NOT EXISTS public.auction_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE NOT NULL,
  escrow_id UUID REFERENCES public.auction_escrow(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL,
  referrer_id UUID,
  winning_bid_amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  referrer_commission NUMERIC DEFAULT 0,
  unilevel_pool NUMERIC DEFAULT 0,
  stairstep_pool NUMERIC DEFAULT 0,
  leadership_pool NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on auction_commissions
ALTER TABLE public.auction_commissions ENABLE ROW LEVEL SECURITY;

-- Create policies for auction_commissions
CREATE POLICY "Admin can view all auction commissions"
ON public.auction_commissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage auction commissions"
ON public.auction_commissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_auction_commissions_auction_id ON public.auction_commissions(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_commissions_seller_id ON public.auction_commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_auction_commissions_referrer_id ON public.auction_commissions(referrer_id);