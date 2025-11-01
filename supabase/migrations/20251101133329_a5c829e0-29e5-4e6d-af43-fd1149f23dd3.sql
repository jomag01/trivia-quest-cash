-- Create commissions table to track all referral commissions
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('purchase_commission', 'level_bonus', 'signup_commission')),
  amount DECIMAL(10, 2) NOT NULL,
  level INTEGER NOT NULL,
  purchase_id UUID REFERENCES public.credit_purchases(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own commissions
CREATE POLICY "Users can view their own commissions" 
ON public.commissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_commissions_user_id ON public.commissions(user_id);
CREATE INDEX idx_commissions_from_user_id ON public.commissions(from_user_id);
CREATE INDEX idx_commissions_created_at ON public.commissions(created_at DESC);

-- Add commission tracking columns to user_wallets
ALTER TABLE public.user_wallets 
ADD COLUMN IF NOT EXISTS total_commissions DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_commissions DECIMAL(10, 2) DEFAULT 0;

-- Function to calculate and distribute commissions when credits are purchased
CREATE OR REPLACE FUNCTION public.distribute_purchase_commissions(purchase_id_param UUID, buyer_id UUID, amount_param DECIMAL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_upline_id UUID;
  current_level INTEGER := 1;
  commission_amount DECIMAL;
  commission_rates DECIMAL[] := ARRAY[100, 50, 50, 35, 35, 25, 25]; -- Rates for levels 1-7
BEGIN
  -- Start with the buyer's referrer
  SELECT referred_by INTO current_upline_id
  FROM profiles
  WHERE id = buyer_id;
  
  -- Loop through up to 7 levels of uplines
  WHILE current_upline_id IS NOT NULL AND current_level <= 7 LOOP
    -- Calculate commission based on level (100 pesos per 1000 pesos at level 1, then rates array)
    IF current_level = 1 THEN
      commission_amount := (amount_param / 1000) * 100;
    ELSE
      commission_amount := commission_rates[current_level];
    END IF;
    
    -- Only create commission if amount > 0
    IF commission_amount > 0 THEN
      -- Insert commission record
      INSERT INTO commissions (user_id, from_user_id, commission_type, amount, level, purchase_id, notes)
      VALUES (
        current_upline_id, 
        buyer_id, 
        'purchase_commission', 
        commission_amount, 
        current_level,
        purchase_id_param,
        'Commission from level ' || current_level || ' referral purchase'
      );
      
      -- Update upline's wallet
      UPDATE user_wallets
      SET 
        balance = balance + commission_amount,
        total_commissions = total_commissions + commission_amount
      WHERE user_id = current_upline_id;
    END IF;
    
    -- Move to next upline
    SELECT referred_by INTO current_upline_id
    FROM profiles
    WHERE id = current_upline_id;
    
    current_level := current_level + 1;
  END LOOP;
END;
$$;

-- Function to check and award level 5 completion bonus (200 pesos with 2+ referrals)
CREATE OR REPLACE FUNCTION public.check_level5_bonus(player_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referral_count INTEGER;
  bonus_exists BOOLEAN;
BEGIN
  -- Count direct referrals
  SELECT COUNT(*) INTO referral_count
  FROM profiles
  WHERE referred_by = player_id;
  
  -- Check if bonus already awarded
  SELECT EXISTS(
    SELECT 1 FROM commissions
    WHERE user_id = player_id AND commission_type = 'level_bonus'
  ) INTO bonus_exists;
  
  -- Award bonus if player has 2+ referrals and hasn't received bonus yet
  IF referral_count >= 2 AND NOT bonus_exists THEN
    INSERT INTO commissions (user_id, from_user_id, commission_type, amount, level, notes)
    VALUES (
      player_id,
      player_id,
      'level_bonus',
      200,
      5,
      'Level 5 completion bonus with ' || referral_count || ' referrals'
    );
    
    UPDATE user_wallets
    SET 
      balance = balance + 200,
      total_commissions = total_commissions + 200
    WHERE user_id = player_id;
  END IF;
END;
$$;

-- Create trigger to automatically distribute commissions when credit purchase is completed
CREATE OR REPLACE FUNCTION public.handle_credit_purchase_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only process if status is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Distribute commissions up the referral chain
    PERFORM distribute_purchase_commissions(NEW.id, NEW.user_id, NEW.amount);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_credit_purchase_completed
  AFTER INSERT OR UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_credit_purchase_commission();

-- Create trigger to check for level 5 bonus when user completes a category
CREATE OR REPLACE FUNCTION public.handle_category_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_level INTEGER;
BEGIN
  -- Get user's current level (count of completed categories)
  SELECT COUNT(*) INTO user_level
  FROM user_completed_categories
  WHERE user_id = NEW.user_id;
  
  -- Check if they reached level 5
  IF user_level >= 5 THEN
    PERFORM check_level5_bonus(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_category_completion
  AFTER INSERT ON public.user_completed_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_category_completion();