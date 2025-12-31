-- Driver locations for live tracking
CREATE TABLE public.driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.delivery_riders(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.food_orders(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  heading DECIMAL(5, 2),
  speed DECIMAL(6, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable realtime for driver locations
ALTER TABLE public.driver_locations REPLICA IDENTITY FULL;

-- Driver wallets for earnings
CREATE TABLE public.driver_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE REFERENCES public.delivery_riders(id) ON DELETE CASCADE,
  balance DECIMAL(12, 2) DEFAULT 0,
  total_earnings DECIMAL(12, 2) DEFAULT 0,
  total_tips DECIMAL(12, 2) DEFAULT 0,
  pending_withdrawal DECIMAL(12, 2) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Driver tips from customers
CREATE TABLE public.driver_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.delivery_riders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Food payments tracking
CREATE TABLE public.food_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_reference TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_driver_locations_driver_id ON public.driver_locations(driver_id);
CREATE INDEX idx_driver_locations_order_id ON public.driver_locations(order_id);
CREATE INDEX idx_driver_locations_updated_at ON public.driver_locations(updated_at DESC);
CREATE INDEX idx_driver_tips_order_id ON public.driver_tips(order_id);
CREATE INDEX idx_driver_tips_driver_id ON public.driver_tips(driver_id);
CREATE INDEX idx_food_payments_order_id ON public.food_payments(order_id);

-- Enable RLS
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for driver_locations
CREATE POLICY "Drivers can update their own location"
ON public.driver_locations FOR ALL
USING (driver_id IN (SELECT id FROM public.delivery_riders WHERE user_id = auth.uid()));

CREATE POLICY "Anyone can view driver locations for active orders"
ON public.driver_locations FOR SELECT
USING (true);

-- RLS Policies for driver_wallets
CREATE POLICY "Drivers can view their own wallet"
ON public.driver_wallets FOR SELECT
USING (driver_id IN (SELECT id FROM public.delivery_riders WHERE user_id = auth.uid()));

CREATE POLICY "System can update wallets"
ON public.driver_wallets FOR ALL
USING (true);

-- RLS Policies for driver_tips
CREATE POLICY "Customers can insert tips"
ON public.driver_tips FOR INSERT
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers can view their tips"
ON public.driver_tips FOR SELECT
USING (driver_id IN (SELECT id FROM public.delivery_riders WHERE user_id = auth.uid()) OR customer_id = auth.uid());

-- RLS Policies for food_payments
CREATE POLICY "Users can view their payments"
ON public.food_payments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their payments"
ON public.food_payments FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Enable realtime for notifications and driver_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_locations;

-- Function to auto-create wallet when rider is approved
CREATE OR REPLACE FUNCTION public.create_driver_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    INSERT INTO public.driver_wallets (driver_id)
    VALUES (NEW.id)
    ON CONFLICT (driver_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_rider_approved
AFTER INSERT OR UPDATE ON public.delivery_riders
FOR EACH ROW EXECUTE FUNCTION public.create_driver_wallet();

-- Function to credit tip to driver wallet
CREATE OR REPLACE FUNCTION public.credit_driver_tip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.driver_wallets
  SET 
    balance = balance + NEW.amount,
    total_tips = total_tips + NEW.amount,
    total_earnings = total_earnings + NEW.amount,
    updated_at = now()
  WHERE driver_id = NEW.driver_id;
  
  UPDATE public.driver_tips
  SET status = 'credited'
  WHERE id = NEW.id;
  
  -- Notify driver
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT user_id, 'tip_received', 'Tip Received!', 'You received a ₱' || NEW.amount || ' tip!'
  FROM public.delivery_riders WHERE id = NEW.driver_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tip_inserted
AFTER INSERT ON public.driver_tips
FOR EACH ROW EXECUTE FUNCTION public.credit_driver_tip();