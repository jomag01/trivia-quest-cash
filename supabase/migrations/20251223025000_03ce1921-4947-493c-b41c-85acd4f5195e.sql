-- Create website builder subscription plans table
CREATE TABLE public.website_builder_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  yearly_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  unilevel_commission_percent DECIMAL(5,2) DEFAULT 10,
  stairstep_commission_percent DECIMAL(5,2) DEFAULT 5,
  leadership_commission_percent DECIMAL(5,2) DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user subscriptions table
CREATE TABLE public.website_builder_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.website_builder_plans(id) ON DELETE SET NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  amount_paid DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subscription payments/commissions table
CREATE TABLE public.subscription_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.website_builder_subscriptions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('unilevel', 'stairstep', 'leadership')),
  amount DECIMAL(10,2) NOT NULL,
  level INTEGER DEFAULT 1,
  from_user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.website_builder_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_builder_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_commissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans (publicly readable, admin writable)
CREATE POLICY "Anyone can view active plans" ON public.website_builder_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage plans" ON public.website_builder_plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.website_builder_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" ON public.website_builder_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.website_builder_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.website_builder_subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for commissions
CREATE POLICY "Users can view their commissions" ON public.subscription_commissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage commissions" ON public.subscription_commissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default plan
INSERT INTO public.website_builder_plans (name, description, monthly_price, yearly_price, features, unilevel_commission_percent, stairstep_commission_percent, leadership_commission_percent)
VALUES (
  'Website Builder Pro',
  'Full access to AI Website Builder with unlimited websites',
  29.99,
  299.99,
  '["Unlimited websites", "All templates", "Custom domains", "Priority support", "Export to hosting"]'::jsonb,
  10,
  5,
  3
);

-- Add app_settings for feature unlock configuration
INSERT INTO public.app_settings (key, value) VALUES 
  ('ai_features_unlock_on_credits', 'true'),
  ('website_builder_subscription_only', 'true')
ON CONFLICT (key) DO NOTHING;

-- Create trigger for updating timestamps
CREATE TRIGGER update_website_builder_plans_updated_at
  BEFORE UPDATE ON public.website_builder_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_builder_subscriptions_updated_at
  BEFORE UPDATE ON public.website_builder_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();