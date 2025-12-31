-- Cities and Zones for multi-city rollout
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT DEFAULT 'Philippines',
  currency TEXT DEFAULT 'PHP',
  timezone TEXT DEFAULT 'Asia/Manila',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  polygon_coordinates JSONB,
  base_delivery_fee DECIMAL(10,2) DEFAULT 49,
  per_km_fee DECIMAL(10,2) DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Delivery pricing with surge support
CREATE TABLE public.delivery_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  base_fee DECIMAL(10,2) DEFAULT 49,
  per_km_fee DECIMAL(10,2) DEFAULT 10,
  peak_multiplier DECIMAL(3,2) DEFAULT 1.0,
  min_fee DECIMAL(10,2) DEFAULT 29,
  max_fee DECIMAL(10,2) DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Surge pricing rules
CREATE TABLE public.surge_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('demand', 'weather', 'time', 'event')),
  conditions JSONB,
  multiplier DECIMAL(3,2) DEFAULT 1.5,
  is_active BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Restaurant commissions
CREATE TABLE public.restaurant_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'flat')),
  commission_value DECIMAL(10,2) DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order commission tracking
CREATE TABLE public.order_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  gross_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  net_payout DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Restaurant wallets for payouts
CREATE TABLE public.restaurant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  total_commission_paid DECIMAL(12,2) DEFAULT 0,
  pending_payout DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payout transactions
CREATE TABLE public.restaurant_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  payout_method TEXT DEFAULT 'bank',
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  reference_number TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_date DATE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- System settings for sandbox mode
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  environment TEXT DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Driver dispatch scores for AI optimization
CREATE TABLE public.driver_dispatch_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.delivery_riders(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.food_orders(id) ON DELETE SET NULL,
  distance_score DECIMAL(5,2),
  idle_score DECIMAL(5,2),
  rating_score DECIMAL(5,2),
  acceptance_score DECIMAL(5,2),
  total_score DECIMAL(5,2),
  was_assigned BOOLEAN DEFAULT false,
  was_accepted BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add city_id to existing tables
ALTER TABLE public.food_vendors ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);
ALTER TABLE public.delivery_riders ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS surge_multiplier DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS pickup_lat DECIMAL(10,8);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS pickup_lng DECIMAL(11,8);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS dropoff_lat DECIMAL(10,8);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS dropoff_lng DECIMAL(11,8);
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS estimated_time_minutes INTEGER;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6,2);

-- Indexes for performance
CREATE INDEX idx_cities_active ON public.cities(is_active);
CREATE INDEX idx_zones_city ON public.delivery_zones(city_id);
CREATE INDEX idx_surge_city ON public.surge_rules(city_id, is_active);
CREATE INDEX idx_restaurant_commissions_restaurant ON public.restaurant_commissions(restaurant_id);
CREATE INDEX idx_order_commissions_order ON public.order_commissions(order_id);
CREATE INDEX idx_dispatch_scores_driver ON public.driver_dispatch_scores(driver_id);

-- Enable RLS
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_dispatch_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read cities" ON public.cities FOR SELECT USING (is_active = true);
CREATE POLICY "Public read zones" ON public.delivery_zones FOR SELECT USING (is_active = true);
CREATE POLICY "Public read pricing" ON public.delivery_pricing FOR SELECT USING (is_active = true);
CREATE POLICY "Public read surge" ON public.surge_rules FOR SELECT USING (is_active = true);
CREATE POLICY "Restaurant owners view own commissions" ON public.restaurant_commissions FOR SELECT 
  USING (restaurant_id IN (SELECT id FROM public.food_vendors WHERE owner_id = auth.uid()));
CREATE POLICY "Restaurant owners view own order commissions" ON public.order_commissions FOR SELECT 
  USING (restaurant_id IN (SELECT id FROM public.food_vendors WHERE owner_id = auth.uid()));
CREATE POLICY "Restaurant owners view own wallet" ON public.restaurant_wallets FOR SELECT 
  USING (restaurant_id IN (SELECT id FROM public.food_vendors WHERE owner_id = auth.uid()));
CREATE POLICY "Restaurant owners view own payouts" ON public.restaurant_payouts FOR SELECT 
  USING (restaurant_id IN (SELECT id FROM public.food_vendors WHERE owner_id = auth.uid()));
CREATE POLICY "System can manage all" ON public.system_settings FOR ALL USING (true);
CREATE POLICY "Drivers view own scores" ON public.driver_dispatch_scores FOR SELECT 
  USING (driver_id IN (SELECT id FROM public.delivery_riders WHERE user_id = auth.uid()));

-- Insert default city
INSERT INTO public.cities (name, country) VALUES ('Metro Manila', 'Philippines');

-- Insert default system settings
INSERT INTO public.system_settings (key, value, environment, description) VALUES
  ('sandbox_mode', 'false', 'production', 'Enable sandbox/test mode'),
  ('auto_dispatch_enabled', 'true', 'production', 'Enable automatic driver dispatch'),
  ('surge_pricing_enabled', 'true', 'production', 'Enable surge pricing'),
  ('default_commission_rate', '20', 'production', 'Default restaurant commission percentage'),
  ('vat_rate', '12', 'production', 'VAT rate percentage');

-- Function to calculate order commission
CREATE OR REPLACE FUNCTION public.calculate_order_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  commission_rate DECIMAL(10,2);
  commission_amt DECIMAL(12,2);
  vat_amt DECIMAL(12,2);
  net_amt DECIMAL(12,2);
  vat_rate DECIMAL(5,2);
BEGIN
  IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
    -- Get commission rate
    SELECT COALESCE(rc.commission_value, 20) INTO commission_rate
    FROM public.restaurant_commissions rc
    WHERE rc.restaurant_id = NEW.vendor_id AND rc.is_active = true
    LIMIT 1;
    
    IF commission_rate IS NULL THEN
      commission_rate := 20;
    END IF;
    
    -- Get VAT rate
    SELECT COALESCE(value::DECIMAL, 12) INTO vat_rate
    FROM public.system_settings WHERE key = 'vat_rate';
    
    -- Calculate amounts
    commission_amt := NEW.total_amount * (commission_rate / 100);
    vat_amt := commission_amt * (vat_rate / 100);
    net_amt := NEW.total_amount - commission_amt;
    
    -- Insert commission record
    INSERT INTO public.order_commissions (order_id, restaurant_id, gross_amount, commission_amount, vat_amount, net_payout)
    VALUES (NEW.id, NEW.vendor_id, NEW.total_amount, commission_amt, vat_amt, net_amt);
    
    -- Update restaurant wallet
    INSERT INTO public.restaurant_wallets (restaurant_id, balance, total_earnings)
    VALUES (NEW.vendor_id, net_amt, net_amt)
    ON CONFLICT (restaurant_id) DO UPDATE SET
      balance = restaurant_wallets.balance + net_amt,
      total_earnings = restaurant_wallets.total_earnings + net_amt,
      total_commission_paid = restaurant_wallets.total_commission_paid + commission_amt,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_delivered_commission
AFTER UPDATE ON public.food_orders
FOR EACH ROW EXECUTE FUNCTION public.calculate_order_commission();

-- Enable realtime for dispatch
ALTER TABLE public.driver_dispatch_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_dispatch_scores;