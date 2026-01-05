-- Create sub_admin_roles table for managing sub-admin permissions
CREATE TABLE IF NOT EXISTS public.sub_admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role_name TEXT DEFAULT 'sub_admin',
    allowed_tabs TEXT[] DEFAULT '{}',
    can_edit BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    added_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_admin_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage sub-admin roles
CREATE POLICY "Admin can manage sub_admin_roles" 
ON public.sub_admin_roles FOR ALL 
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Sub-admins can view their own role
CREATE POLICY "Users can view own sub_admin_role" 
ON public.sub_admin_roles FOR SELECT 
USING (user_id = auth.uid());

-- Create shareholders table for investment management
CREATE TABLE IF NOT EXISTS public.shareholders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    investment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    share_percentage DECIMAL(5,4) NOT NULL DEFAULT 0,
    total_earnings DECIMAL(15,2) DEFAULT 0,
    pending_payout DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    payment_reference TEXT,
    payment_proof_url TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shareholders ENABLE ROW LEVEL SECURITY;

-- Shareholders can view their own entry
CREATE POLICY "Users can view own shareholder entry" 
ON public.shareholders FOR SELECT 
USING (user_id = auth.uid());

-- Shareholders can insert (apply)
CREATE POLICY "Users can apply as shareholder" 
ON public.shareholders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Only admins can update shareholders
CREATE POLICY "Admin can manage shareholders" 
ON public.shareholders FOR ALL 
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create shareholder_payouts for tracking profit distributions
CREATE TABLE IF NOT EXISTS public.shareholder_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shareholder_id UUID NOT NULL REFERENCES public.shareholders(id) ON DELETE CASCADE,
    payout_amount DECIMAL(15,2) NOT NULL,
    net_profit_amount DECIMAL(15,2) NOT NULL,
    payout_period TEXT,
    status TEXT DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    processed_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shareholder_payouts ENABLE ROW LEVEL SECURITY;

-- Shareholders can view their own payouts
CREATE POLICY "Users can view own shareholder_payouts" 
ON public.shareholder_payouts FOR SELECT 
USING (
    EXISTS (SELECT 1 FROM public.shareholders WHERE id = shareholder_id AND user_id = auth.uid())
);

-- Admins can manage payouts
CREATE POLICY "Admin can manage shareholder_payouts" 
ON public.shareholder_payouts FOR ALL 
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create dynamic_unilevel_levels table for configurable levels
CREATE TABLE IF NOT EXISTS public.dynamic_unilevel_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_number INTEGER NOT NULL UNIQUE,
    level_name TEXT NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dynamic_unilevel_levels ENABLE ROW LEVEL SECURITY;

-- Anyone can read levels
CREATE POLICY "Anyone can read unilevel_levels" 
ON public.dynamic_unilevel_levels FOR SELECT 
USING (true);

-- Only admin can modify
CREATE POLICY "Admin can manage unilevel_levels" 
ON public.dynamic_unilevel_levels FOR ALL 
USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Insert default 7 levels
INSERT INTO public.dynamic_unilevel_levels (level_number, level_name, commission_percentage)
VALUES 
    (1, 'Level 1 (Direct Referral)', 4.00),
    (2, 'Level 2', 3.00),
    (3, 'Level 3', 2.00),
    (4, 'Level 4', 1.50),
    (5, 'Level 5', 1.00),
    (6, 'Level 6', 0.75),
    (7, 'Level 7', 0.50)
ON CONFLICT (level_number) DO NOTHING;

-- Update trigger for timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sub_admin_roles_updated_at
    BEFORE UPDATE ON public.sub_admin_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shareholders_updated_at
    BEFORE UPDATE ON public.shareholders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dynamic_unilevel_levels_updated_at
    BEFORE UPDATE ON public.dynamic_unilevel_levels
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();