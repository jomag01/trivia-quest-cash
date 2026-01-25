-- Add fixed markup column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS fixed_markup_amount NUMERIC DEFAULT 0;

-- Add fixed markup defaults to seller profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS seller_default_fixed_markup NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_default_markup_percentage NUMERIC DEFAULT 20;

-- Create sponsored listings table for Marketplace, Restaurant, Auction
CREATE TABLE IF NOT EXISTS public.sponsored_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_type TEXT NOT NULL CHECK (listing_type IN ('marketplace', 'restaurant', 'auction', 'food_item')),
  listing_id UUID NOT NULL,
  listing_title TEXT NOT NULL,
  listing_image_url TEXT,
  budget_amount NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 7,
  daily_budget NUMERIC GENERATED ALWAYS AS (budget_amount / NULLIF(duration_days, 0)) STORED,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'paused', 'expired', 'rejected')),
  payment_proof_url TEXT,
  payment_reference TEXT,
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  boost_multiplier NUMERIC DEFAULT 2.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_status ON public.sponsored_listings(status);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_type ON public.sponsored_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_user ON public.sponsored_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_active ON public.sponsored_listings(listing_type, status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.sponsored_listings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own sponsored listings"
  ON public.sponsored_listings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sponsored listings"
  ON public.sponsored_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending listings"
  ON public.sponsored_listings FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all sponsored listings"
  ON public.sponsored_listings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all sponsored listings"
  ON public.sponsored_listings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create sponsored listing settings table
CREATE TABLE IF NOT EXISTS public.sponsored_listing_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_type TEXT NOT NULL UNIQUE,
  min_budget NUMERIC DEFAULT 100,
  max_budget NUMERIC DEFAULT 100000,
  min_duration_days INTEGER DEFAULT 1,
  max_duration_days INTEGER DEFAULT 90,
  boost_multiplier NUMERIC DEFAULT 2.0,
  is_enabled BOOLEAN DEFAULT true,
  instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default settings
INSERT INTO public.sponsored_listing_settings (listing_type, min_budget, max_budget, min_duration_days, max_duration_days, boost_multiplier, is_enabled, instructions)
VALUES 
  ('marketplace', 100, 100000, 1, 90, 2.0, true, 'Submit your marketplace listing for sponsored promotion. Your item will appear at the top of search results.'),
  ('restaurant', 100, 100000, 1, 90, 2.0, true, 'Promote your restaurant to appear prominently in food delivery listings.'),
  ('auction', 100, 100000, 1, 90, 2.0, true, 'Boost your auction visibility to attract more bidders.'),
  ('food_item', 100, 100000, 1, 90, 2.0, true, 'Highlight specific food items to increase orders.')
ON CONFLICT (listing_type) DO NOTHING;

-- RLS for settings (public read, admin write)
ALTER TABLE public.sponsored_listing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sponsored listing settings"
  ON public.sponsored_listing_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sponsored listing settings"
  ON public.sponsored_listing_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Add is_sponsored column to marketplace_listings
ALTER TABLE public.marketplace_listings 
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMP WITH TIME ZONE;

-- Add is_sponsored to food_vendors (restaurants)
ALTER TABLE public.food_vendors 
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMP WITH TIME ZONE;

-- Add is_sponsored to auctions
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMP WITH TIME ZONE;

-- Add is_sponsored to food_items
ALTER TABLE public.food_items 
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sponsored_until TIMESTAMP WITH TIME ZONE;