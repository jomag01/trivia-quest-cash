-- Auction categories
CREATE TABLE public.auction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'Gavel',
  color TEXT DEFAULT 'amber',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Main auctions table
CREATE TABLE public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.auction_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  condition TEXT CHECK (condition IN ('new', 'like_new', 'used', 'vintage', 'antique')) DEFAULT 'used',
  starting_bid NUMERIC NOT NULL CHECK (starting_bid > 0),
  reserve_price NUMERIC,
  buy_now_price NUMERIC,
  current_bid NUMERIC DEFAULT 0,
  current_bidder_id UUID REFERENCES public.profiles(id),
  bid_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  original_end_time TIMESTAMPTZ,
  anti_snipe_minutes INTEGER DEFAULT 5,
  anti_snipe_extension_minutes INTEGER DEFAULT 2,
  status TEXT CHECK (status IN ('draft', 'pending_approval', 'active', 'ended', 'sold', 'cancelled', 'reserve_not_met')) DEFAULT 'draft',
  winner_id UUID REFERENCES public.profiles(id),
  winning_bid NUMERIC,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  shipping_fee NUMERIC DEFAULT 0,
  shipping_options JSONB DEFAULT '[]',
  weight_kg NUMERIC,
  dimensions_cm TEXT,
  ai_suggested_price NUMERIC,
  blockchain_hash TEXT,
  featured BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  admin_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bids table
CREATE TABLE public.auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  is_auto_bid BOOLEAN DEFAULT false,
  max_auto_bid NUMERIC,
  bid_hash TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-bid settings
CREATE TABLE public.auction_auto_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_amount NUMERIC NOT NULL CHECK (max_amount > 0),
  increment_amount NUMERIC DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auction_id, bidder_id)
);

-- Watchlist
CREATE TABLE public.auction_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notify_outbid BOOLEAN DEFAULT true,
  notify_ending BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(auction_id, user_id)
);

-- Escrow payments for auctions
CREATE TABLE public.auction_escrow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC DEFAULT 0,
  shipping_fee NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  payment_proof_url TEXT,
  status TEXT CHECK (status IN ('pending_payment', 'paid', 'shipped', 'delivered', 'released', 'disputed', 'refunded')) DEFAULT 'pending_payment',
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  tracking_number TEXT,
  courier TEXT,
  delivered_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  dispute_reason TEXT,
  dispute_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auction messages between buyer and seller
CREATE TABLE public.auction_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auction feedback/reviews
CREATE TABLE public.auction_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id),
  to_user_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  feedback_type TEXT CHECK (feedback_type IN ('buyer_to_seller', 'seller_to_buyer')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auction settings (admin configurable)
CREATE TABLE public.auction_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Blockchain bid log for transparency
CREATE TABLE public.auction_blockchain_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
  bid_id UUID REFERENCES public.auction_bids(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  data_hash TEXT NOT NULL,
  previous_hash TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  verified BOOLEAN DEFAULT false
);

-- Insert default categories
INSERT INTO public.auction_categories (name, slug, icon, color, description, display_order) VALUES
('Antiques', 'antiques', 'Clock', 'amber', 'Rare and vintage antique items', 1),
('Collectibles', 'collectibles', 'Trophy', 'purple', 'Coins, stamps, cards, memorabilia', 2),
('Electronics', 'electronics', 'Smartphone', 'blue', 'Phones, laptops, gadgets', 3),
('Vehicles', 'vehicles', 'Car', 'red', 'Cars, motorcycles, boats', 4),
('Jewelry', 'jewelry', 'Gem', 'pink', 'Watches, rings, necklaces', 5),
('Art', 'art', 'Palette', 'indigo', 'Paintings, sculptures, prints', 6),
('Fashion', 'fashion', 'Shirt', 'rose', 'Designer clothing and accessories', 7),
('Home & Garden', 'home-garden', 'Home', 'green', 'Furniture, decor, tools', 8),
('Sports', 'sports', 'Dumbbell', 'orange', 'Equipment and memorabilia', 9),
('General', 'general', 'Package', 'slate', 'Other items for auction', 10);

-- Insert default settings
INSERT INTO public.auction_settings (setting_key, setting_value) VALUES
('platform_fee_percent', '5'),
('min_bid_increment', '10'),
('max_auction_duration_days', '30'),
('anti_snipe_enabled', 'true'),
('anti_snipe_minutes', '5'),
('anti_snipe_extension', '2'),
('require_approval', 'true'),
('featured_cost_diamonds', '100'),
('ai_price_enabled', 'true');

-- Enable RLS
ALTER TABLE public.auction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_auto_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_blockchain_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Categories: public read
CREATE POLICY "Anyone can view active categories" ON public.auction_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.auction_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auctions: public read for active, seller manages own
CREATE POLICY "Anyone can view active auctions" ON public.auctions FOR SELECT USING (status IN ('active', 'ended', 'sold'));
CREATE POLICY "Sellers can view own auctions" ON public.auctions FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Verified sellers can create auctions" ON public.auctions FOR INSERT WITH CHECK (
  seller_id = auth.uid() AND 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified_seller = true)
);
CREATE POLICY "Sellers can update own auctions" ON public.auctions FOR UPDATE USING (seller_id = auth.uid());
CREATE POLICY "Admins can manage all auctions" ON public.auctions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bids: authenticated users
CREATE POLICY "Anyone can view bids" ON public.auction_bids FOR SELECT USING (true);
CREATE POLICY "Authenticated can place bids" ON public.auction_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);
CREATE POLICY "Admins can manage bids" ON public.auction_bids FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Auto-bids: own only
CREATE POLICY "Users can view own auto-bids" ON public.auction_auto_bids FOR SELECT USING (bidder_id = auth.uid());
CREATE POLICY "Users can manage own auto-bids" ON public.auction_auto_bids FOR ALL USING (bidder_id = auth.uid());

-- Watchlist: own only
CREATE POLICY "Users can view own watchlist" ON public.auction_watchlist FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage own watchlist" ON public.auction_watchlist FOR ALL USING (user_id = auth.uid());

-- Escrow: buyer/seller/admin
CREATE POLICY "Buyer can view own escrow" ON public.auction_escrow FOR SELECT USING (buyer_id = auth.uid());
CREATE POLICY "Seller can view own escrow" ON public.auction_escrow FOR SELECT USING (seller_id = auth.uid());
CREATE POLICY "Admins can manage escrow" ON public.auction_escrow FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers can update payment" ON public.auction_escrow FOR UPDATE USING (buyer_id = auth.uid());

-- Messages: sender/receiver
CREATE POLICY "Users can view own messages" ON public.auction_messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users can send messages" ON public.auction_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update own messages" ON public.auction_messages FOR UPDATE USING (receiver_id = auth.uid());

-- Feedback: public read, participants write
CREATE POLICY "Anyone can view feedback" ON public.auction_feedback FOR SELECT USING (true);
CREATE POLICY "Participants can leave feedback" ON public.auction_feedback FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Settings: public read, admin write
CREATE POLICY "Anyone can view settings" ON public.auction_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.auction_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Blockchain log: public read
CREATE POLICY "Anyone can view blockchain log" ON public.auction_blockchain_log FOR SELECT USING (true);
CREATE POLICY "System can insert blockchain log" ON public.auction_blockchain_log FOR INSERT WITH CHECK (true);

-- Enable realtime for auctions and bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_bids;

-- Indexes for performance
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_ends_at ON public.auctions(ends_at);
CREATE INDEX idx_auctions_seller ON public.auctions(seller_id);
CREATE INDEX idx_auctions_category ON public.auctions(category_id);
CREATE INDEX idx_bids_auction ON public.auction_bids(auction_id);
CREATE INDEX idx_bids_bidder ON public.auction_bids(bidder_id);
CREATE INDEX idx_watchlist_user ON public.auction_watchlist(user_id);
CREATE INDEX idx_escrow_buyer ON public.auction_escrow(buyer_id);
CREATE INDEX idx_escrow_seller ON public.auction_escrow(seller_id);