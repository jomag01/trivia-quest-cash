-- AI Credit purchase tracking with affiliate integration
CREATE TABLE IF NOT EXISTS public.ai_credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credits_received INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'credits',
  referrer_id UUID,
  admin_earnings DECIMAL(10,2) DEFAULT 0,
  unilevel_commission DECIMAL(10,2) DEFAULT 0,
  stairstep_commission DECIMAL(10,2) DEFAULT 0,
  leadership_commission DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_credit_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own AI credit purchases" ON public.ai_credit_purchases
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can insert own AI credit purchases" ON public.ai_credit_purchases
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all AI credit purchases" ON public.ai_credit_purchases
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Insert default AI credit settings
INSERT INTO public.app_settings (key, value) VALUES 
  ('ai_credit_tier_1_price', '100'),
  ('ai_credit_tier_1_credits', '50'),
  ('ai_credit_tier_1_image', '30'),
  ('ai_credit_tier_1_video', '10'),
  ('ai_credit_tier_2_price', '250'),
  ('ai_credit_tier_2_credits', '150'),
  ('ai_credit_tier_2_image', '100'),
  ('ai_credit_tier_2_video', '30'),
  ('ai_credit_tier_3_price', '500'),
  ('ai_credit_tier_3_credits', '400'),
  ('ai_credit_tier_3_image', '300'),
  ('ai_credit_tier_3_video', '80'),
  ('ai_admin_earnings_percent', '35'),
  ('ai_unilevel_percent', '40'),
  ('ai_stairstep_percent', '35'),
  ('ai_leadership_percent', '25')
ON CONFLICT (key) DO NOTHING;