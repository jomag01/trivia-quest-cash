-- Create binary placement enum
CREATE TYPE public.binary_leg AS ENUM ('left', 'right');

-- Binary MLM system tables
CREATE TABLE public.binary_network (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    sponsor_id UUID REFERENCES public.binary_network(id),
    parent_id UUID REFERENCES public.binary_network(id),
    placement_leg binary_leg,
    left_child_id UUID REFERENCES public.binary_network(id),
    right_child_id UUID REFERENCES public.binary_network(id),
    left_volume DECIMAL(12,2) DEFAULT 0,
    right_volume DECIMAL(12,2) DEFAULT 0,
    total_cycles INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Binary commissions earned
CREATE TABLE public.binary_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    cycles_matched INTEGER DEFAULT 1,
    left_volume_used DECIMAL(12,2) NOT NULL,
    right_volume_used DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Binary daily earnings tracker (for caps)
CREATE TABLE public.binary_daily_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    earning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_earned DECIMAL(12,2) DEFAULT 0,
    cycles_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, earning_date)
);

-- Binary AI credit purchases (first purchase enrolls in binary)
CREATE TABLE public.binary_ai_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    package_id UUID,
    amount DECIMAL(12,2) NOT NULL,
    credits_received INTEGER NOT NULL,
    sponsor_id UUID,
    is_first_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Auto-replenish tracking
CREATE TABLE public.binary_auto_replenish (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'unilevel', 'stairstep', 'leadership'
    source_commission_id UUID,
    amount_deducted DECIMAL(12,2) NOT NULL,
    credits_replenished INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.binary_network ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binary_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binary_daily_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binary_ai_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.binary_auto_replenish ENABLE ROW LEVEL SECURITY;

-- RLS Policies for binary_network
CREATE POLICY "Users can view their own binary position"
ON public.binary_network FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "Users can view their downline"
ON public.binary_network FOR SELECT
USING (sponsor_id IN (SELECT id FROM public.binary_network WHERE user_id = auth.uid()));

CREATE POLICY "System can insert binary positions"
ON public.binary_network FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "System can update binary positions"
ON public.binary_network FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- RLS Policies for binary_commissions
CREATE POLICY "Users can view their own commissions"
ON public.binary_commissions FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "System can insert commissions"
ON public.binary_commissions FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- RLS Policies for binary_daily_earnings
CREATE POLICY "Users can view their own daily earnings"
ON public.binary_daily_earnings FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "System can manage daily earnings"
ON public.binary_daily_earnings FOR ALL
USING (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- RLS Policies for binary_ai_purchases
CREATE POLICY "Users can view their own purchases"
ON public.binary_ai_purchases FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "Users can insert their own purchases"
ON public.binary_ai_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for binary_auto_replenish
CREATE POLICY "Users can view their own replenish history"
ON public.binary_auto_replenish FOR SELECT
USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

CREATE POLICY "System can insert replenish records"
ON public.binary_auto_replenish FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'));

-- Create indexes for performance
CREATE INDEX idx_binary_network_sponsor ON public.binary_network(sponsor_id);
CREATE INDEX idx_binary_network_parent ON public.binary_network(parent_id);
CREATE INDEX idx_binary_commissions_user ON public.binary_commissions(user_id);
CREATE INDEX idx_binary_daily_earnings_user_date ON public.binary_daily_earnings(user_id, earning_date);
CREATE INDEX idx_binary_ai_purchases_user ON public.binary_ai_purchases(user_id);