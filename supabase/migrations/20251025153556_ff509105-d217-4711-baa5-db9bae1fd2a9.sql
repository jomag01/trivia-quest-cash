-- Create prize configuration table
CREATE TABLE IF NOT EXISTS public.prize_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER NOT NULL UNIQUE,
  credits DECIMAL(10, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prize_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view active prizes
CREATE POLICY "Anyone can view active prizes"
ON public.prize_config
FOR SELECT
USING (is_active = true);

-- Admins can manage prizes
CREATE POLICY "Admins can manage prizes"
ON public.prize_config
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default prize configuration for levels 5, 10, 15
INSERT INTO public.prize_config (level, credits, description) VALUES
(5, 100.00, 'Congratulations! You completed 5 levels'),
(10, 500.00, 'Amazing! You completed 10 levels'),
(15, 1000.00, 'Incredible! You completed all 15 levels!')
ON CONFLICT (level) DO NOTHING;

-- Create user prize claims table to track awarded prizes
CREATE TABLE IF NOT EXISTS public.user_prize_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level INTEGER NOT NULL,
  credits_awarded DECIMAL(10, 2) NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, level)
);

-- Enable RLS
ALTER TABLE public.user_prize_claims ENABLE ROW LEVEL SECURITY;

-- Users can view their own claims
CREATE POLICY "Users can view their own prize claims"
ON public.user_prize_claims
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own claims (will be controlled by app logic)
CREATE POLICY "Users can insert their own prize claims"
ON public.user_prize_claims
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all claims
CREATE POLICY "Admins can view all prize claims"
ON public.user_prize_claims
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for high-scale performance
CREATE INDEX IF NOT EXISTS idx_prize_config_level ON public.prize_config(level);
CREATE INDEX IF NOT EXISTS idx_user_prize_claims_user_id ON public.user_prize_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prize_claims_level ON public.user_prize_claims(level);
CREATE INDEX IF NOT EXISTS idx_user_prize_claims_claimed_at ON public.user_prize_claims(claimed_at);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_answered_user_question ON public.user_answered_questions(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_questions_category_active ON public.questions(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_questions_category_difficulty ON public.questions(category_id, difficulty) WHERE is_active = true;

-- Update trigger
CREATE TRIGGER update_prize_config_updated_at
BEFORE UPDATE ON public.prize_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add function to claim prize and award credits
CREATE OR REPLACE FUNCTION public.claim_level_prize(
  _user_id UUID,
  _level INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prize_config RECORD;
  v_already_claimed BOOLEAN;
  v_new_balance DECIMAL(10, 2);
BEGIN
  -- Check if already claimed
  SELECT EXISTS(
    SELECT 1 FROM public.user_prize_claims 
    WHERE user_id = _user_id AND level = _level
  ) INTO v_already_claimed;
  
  IF v_already_claimed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Prize already claimed');
  END IF;
  
  -- Get prize configuration
  SELECT * INTO v_prize_config
  FROM public.prize_config
  WHERE level = _level AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Prize configuration not found');
  END IF;
  
  -- Award credits to user's profile
  UPDATE public.profiles
  SET credits = credits + v_prize_config.credits
  WHERE id = _user_id
  RETURNING credits INTO v_new_balance;
  
  -- Record the claim
  INSERT INTO public.user_prize_claims (user_id, level, credits_awarded)
  VALUES (_user_id, _level, v_prize_config.credits);
  
  RETURN jsonb_build_object(
    'success', true, 
    'credits_awarded', v_prize_config.credits,
    'new_balance', v_new_balance,
    'message', v_prize_config.description
  );
END;
$$;