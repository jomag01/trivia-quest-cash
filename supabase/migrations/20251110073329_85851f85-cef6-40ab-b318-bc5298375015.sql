-- Create gems and diamonds wallet table
CREATE TABLE IF NOT EXISTS public.treasure_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gems INTEGER NOT NULL DEFAULT 0,
  diamonds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.treasure_wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies for treasure_wallet
CREATE POLICY "Users can view their own treasure wallet"
  ON public.treasure_wallet FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own treasure wallet"
  ON public.treasure_wallet FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own treasure wallet"
  ON public.treasure_wallet FOR UPDATE
  USING (auth.uid() = user_id);

-- Create marketplace listings table
CREATE TABLE IF NOT EXISTS public.diamond_marketplace (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diamond_amount INTEGER NOT NULL CHECK (diamond_amount > 0),
  price_per_diamond DECIMAL(10,2) NOT NULL CHECK (price_per_diamond > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diamond_marketplace ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketplace
CREATE POLICY "Anyone can view active listings"
  ON public.diamond_marketplace FOR SELECT
  USING (status = 'active' OR auth.uid() = seller_id);

CREATE POLICY "Users can create their own listings"
  ON public.diamond_marketplace FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Users can update their own listings"
  ON public.diamond_marketplace FOR UPDATE
  USING (auth.uid() = seller_id);

-- Create diamond transactions table
CREATE TABLE IF NOT EXISTS public.diamond_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.diamond_marketplace(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diamond_amount INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'sale')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diamond_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions"
  ON public.diamond_transactions FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Create admin settings for diamond pricing
CREATE TABLE IF NOT EXISTS public.treasure_admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treasure_admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin settings
CREATE POLICY "Anyone can view settings"
  ON public.treasure_admin_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify settings"
  ON public.treasure_admin_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default diamond price setting
INSERT INTO public.treasure_admin_settings (setting_key, setting_value, description)
VALUES 
  ('diamond_base_price', '10.00', 'Base price per diamond in currency'),
  ('gem_to_diamond_ratio', '100', 'Number of gems needed to convert to 1 diamond')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to update treasure wallet
CREATE OR REPLACE FUNCTION public.update_treasure_wallet(
  p_user_id UUID,
  p_gems INTEGER DEFAULT 0,
  p_diamonds INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update wallet
  INSERT INTO public.treasure_wallet (user_id, gems, diamonds)
  VALUES (p_user_id, p_gems, p_diamonds)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    gems = treasure_wallet.gems + p_gems,
    diamonds = treasure_wallet.diamonds + p_diamonds,
    updated_at = now();
END;
$$;

-- Create function to convert gems to diamonds
CREATE OR REPLACE FUNCTION public.convert_gems_to_diamonds(
  p_user_id UUID,
  p_gem_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ratio INTEGER;
  v_diamonds_earned INTEGER;
  v_current_gems INTEGER;
BEGIN
  -- Get conversion ratio
  SELECT setting_value::INTEGER INTO v_ratio
  FROM public.treasure_admin_settings
  WHERE setting_key = 'gem_to_diamond_ratio';

  -- Get current gems
  SELECT gems INTO v_current_gems
  FROM public.treasure_wallet
  WHERE user_id = p_user_id;

  -- Check if user has enough gems
  IF v_current_gems < p_gem_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient gems');
  END IF;

  -- Calculate diamonds
  v_diamonds_earned := p_gem_amount / v_ratio;

  IF v_diamonds_earned < 1 THEN
    RETURN json_build_object('success', false, 'message', 'Not enough gems to convert');
  END IF;

  -- Update wallet
  UPDATE public.treasure_wallet
  SET 
    gems = gems - (v_diamonds_earned * v_ratio),
    diamonds = diamonds + v_diamonds_earned,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true, 
    'diamonds_earned', v_diamonds_earned,
    'gems_used', v_diamonds_earned * v_ratio
  );
END;
$$;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_treasure_wallet_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_treasure_wallet_updated_at
BEFORE UPDATE ON public.treasure_wallet
FOR EACH ROW
EXECUTE FUNCTION public.update_treasure_wallet_updated_at();

CREATE TRIGGER trigger_marketplace_updated_at
BEFORE UPDATE ON public.diamond_marketplace
FOR EACH ROW
EXECUTE FUNCTION public.update_treasure_wallet_updated_at();

CREATE TRIGGER trigger_settings_updated_at
BEFORE UPDATE ON public.treasure_admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_treasure_wallet_updated_at();