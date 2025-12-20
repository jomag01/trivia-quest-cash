-- Create marketplace listing categories enum
CREATE TYPE public.marketplace_category AS ENUM (
  'property_sale',
  'vehicle_sale', 
  'secondhand_items',
  'property_rent',
  'room_rent',
  'hotel_staycation'
);

-- Create marketplace listing status enum
CREATE TYPE public.marketplace_listing_status AS ENUM (
  'active',
  'pending',
  'sold',
  'rented',
  'expired',
  'deleted'
);

-- Create marketplace listings table
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category marketplace_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'negotiable', 'per_night', 'per_day', 'per_month')),
  currency TEXT DEFAULT 'PHP',
  location TEXT,
  city TEXT,
  province TEXT,
  country TEXT DEFAULT 'Philippines',
  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  specifications JSONB DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  condition TEXT CHECK (condition IN ('new', 'like_new', 'good', 'fair', 'for_parts')),
  status marketplace_listing_status DEFAULT 'pending',
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  featured_until TIMESTAMP WITH TIME ZONE,
  available_from DATE,
  available_until DATE,
  min_stay_nights INTEGER,
  max_guests INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  area_sqm DECIMAL(10,2),
  year_built INTEGER,
  brand TEXT,
  model TEXT,
  year INTEGER,
  mileage INTEGER,
  fuel_type TEXT,
  transmission TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- Create marketplace inquiries table
CREATE TABLE public.marketplace_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  inquirer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  preferred_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'closed')),
  seller_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create marketplace favorites table
CREATE TABLE public.marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Create affiliate eligibility check function
CREATE OR REPLACE FUNCTION public.check_marketplace_eligibility(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_count INTEGER;
  has_purchase BOOLEAN;
BEGIN
  -- Count referrals
  SELECT COUNT(*) INTO referral_count
  FROM public.profiles
  WHERE referrer_id = user_uuid;
  
  -- Check for diamond purchase or AI credit purchase
  SELECT EXISTS(
    SELECT 1 FROM public.credit_purchases 
    WHERE user_id = user_uuid AND status = 'approved'
    UNION
    SELECT 1 FROM public.ai_credit_purchases
    WHERE user_id = user_uuid AND status = 'approved'
    UNION
    SELECT 1 FROM public.binary_ai_purchases
    WHERE user_id = user_uuid AND status = 'approved'
  ) INTO has_purchase;
  
  -- Must have 2+ referrals AND at least one purchase
  RETURN referral_count >= 2 AND has_purchase;
END;
$$;

-- Enable RLS
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace_listings
CREATE POLICY "Anyone can view active listings"
ON public.marketplace_listings FOR SELECT
USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY "Eligible users can create listings"
ON public.marketplace_listings FOR INSERT
WITH CHECK (
  auth.uid() = seller_id AND 
  public.check_marketplace_eligibility(auth.uid())
);

CREATE POLICY "Sellers can update own listings"
ON public.marketplace_listings FOR UPDATE
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete own listings"
ON public.marketplace_listings FOR DELETE
USING (auth.uid() = seller_id);

-- RLS Policies for marketplace_inquiries
CREATE POLICY "Users can view their inquiries"
ON public.marketplace_inquiries FOR SELECT
USING (
  auth.uid() = inquirer_id OR 
  auth.uid() IN (SELECT seller_id FROM public.marketplace_listings WHERE id = listing_id)
);

CREATE POLICY "Authenticated users can create inquiries"
ON public.marketplace_inquiries FOR INSERT
WITH CHECK (auth.uid() = inquirer_id);

CREATE POLICY "Sellers can update inquiry responses"
ON public.marketplace_inquiries FOR UPDATE
USING (
  auth.uid() IN (SELECT seller_id FROM public.marketplace_listings WHERE id = listing_id)
);

-- RLS Policies for marketplace_favorites
CREATE POLICY "Users can view own favorites"
ON public.marketplace_favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
ON public.marketplace_favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
ON public.marketplace_favorites FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_marketplace_listings_category ON public.marketplace_listings(category);
CREATE INDEX idx_marketplace_listings_status ON public.marketplace_listings(status);
CREATE INDEX idx_marketplace_listings_seller ON public.marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_listings_price ON public.marketplace_listings(price);
CREATE INDEX idx_marketplace_listings_location ON public.marketplace_listings(city, province);
CREATE INDEX idx_marketplace_inquiries_listing ON public.marketplace_inquiries(listing_id);
CREATE INDEX idx_marketplace_favorites_user ON public.marketplace_favorites(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_marketplace_listings_updated_at
BEFORE UPDATE ON public.marketplace_listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();