
-- Create seller referrer commission settings table for category-based commissions
CREATE TABLE IF NOT EXISTS public.seller_referrer_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 2,
  admin_markup_percent DECIMAL(5,2) NOT NULL DEFAULT 5,
  unilevel_percent DECIMAL(5,2) NOT NULL DEFAULT 40,
  stairstep_percent DECIMAL(5,2) NOT NULL DEFAULT 35,
  leadership_percent DECIMAL(5,2) NOT NULL DEFAULT 25,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_referrer_commissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view seller referrer commissions" ON public.seller_referrer_commissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage seller referrer commissions" ON public.seller_referrer_commissions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default commission categories
INSERT INTO public.seller_referrer_commissions (category, commission_percent, admin_markup_percent, unilevel_percent, stairstep_percent, leadership_percent) VALUES
  ('products', 2, 5, 40, 35, 25),
  ('auctions', 3, 7, 40, 35, 25),
  ('services', 2.5, 5, 40, 35, 25),
  ('food', 2, 5, 40, 35, 25),
  ('marketplace', 2, 5, 40, 35, 25)
ON CONFLICT (category) DO NOTHING;

-- Create seller referrer earnings table to track recurring commissions
CREATE TABLE IF NOT EXISTS public.seller_referrer_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID,
  source_category TEXT NOT NULL,
  sale_amount DECIMAL(12,2) NOT NULL,
  admin_markup_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  referrer_commission DECIMAL(12,2) NOT NULL,
  unilevel_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  stairstep_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  leadership_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  admin_net_profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_referrer_earnings ENABLE ROW LEVEL SECURITY;

-- Policies for seller referrer earnings
CREATE POLICY "Users can view their own referrer earnings" ON public.seller_referrer_earnings 
  FOR SELECT USING (referrer_id = auth.uid() OR seller_id = auth.uid());
CREATE POLICY "System can insert referrer earnings" ON public.seller_referrer_earnings 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update referrer earnings" ON public.seller_referrer_earnings 
  FOR UPDATE USING (true);

-- Add seller_referrer_id to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_referrer_id') THEN
    ALTER TABLE public.profiles ADD COLUMN seller_referrer_id UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_seller') THEN
    ALTER TABLE public.profiles ADD COLUMN is_seller BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_registered_at') THEN
    ALTER TABLE public.profiles ADD COLUMN seller_registered_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'seller_category') THEN
    ALTER TABLE public.profiles ADD COLUMN seller_category TEXT;
  END IF;
END $$;

-- Create commission notifications table
CREATE TABLE IF NOT EXISTS public.commission_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  source_type TEXT NOT NULL,
  source_id UUID,
  amount DECIMAL(12,2) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for commission notifications
CREATE POLICY "Users can view their own commission notifications" ON public.commission_notifications 
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own commission notifications" ON public.commission_notifications 
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can insert commission notifications" ON public.commission_notifications 
  FOR INSERT WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_seller_referrer_earnings_referrer ON public.seller_referrer_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_seller_referrer_earnings_seller ON public.seller_referrer_earnings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_referrer_earnings_category ON public.seller_referrer_earnings(source_category);
CREATE INDEX IF NOT EXISTS idx_commission_notifications_user ON public.commission_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_notifications_unread ON public.commission_notifications(user_id, is_read) WHERE is_read = false;

-- Enable realtime for commission notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.commission_notifications;
