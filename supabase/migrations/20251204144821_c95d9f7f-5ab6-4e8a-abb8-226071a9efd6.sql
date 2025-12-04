-- Create services table for users to list their bookable services
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 60,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    approval_status TEXT DEFAULT 'pending',
    diamond_reward INTEGER DEFAULT 0,
    referral_commission_diamonds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service bookings table
CREATE TABLE public.service_bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    status TEXT DEFAULT 'pending',
    total_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    referrer_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blockout dates table for service providers
CREATE TABLE public.service_blockout_dates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    blockout_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service categories table
CREATE TABLE public.service_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_blockout_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Services policies
CREATE POLICY "Anyone can view active approved services" ON public.services
FOR SELECT USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Providers can manage their own services" ON public.services
FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Admins can manage all services" ON public.services
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.service_bookings
FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = provider_id);

CREATE POLICY "Users can create bookings" ON public.service_bookings
FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own bookings" ON public.service_bookings
FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Blockout dates policies
CREATE POLICY "Anyone can view blockout dates" ON public.service_blockout_dates
FOR SELECT USING (true);

CREATE POLICY "Providers can manage their blockout dates" ON public.service_blockout_dates
FOR ALL USING (auth.uid() = provider_id);

-- Service categories policies
CREATE POLICY "Anyone can view active categories" ON public.service_categories
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.service_categories
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes
CREATE INDEX idx_services_provider ON public.services(provider_id);
CREATE INDEX idx_services_category ON public.services(category);
CREATE INDEX idx_bookings_customer ON public.service_bookings(customer_id);
CREATE INDEX idx_bookings_provider ON public.service_bookings(provider_id);
CREATE INDEX idx_bookings_date ON public.service_bookings(booking_date);
CREATE INDEX idx_blockout_dates_provider ON public.service_blockout_dates(provider_id);
CREATE INDEX idx_blockout_dates_date ON public.service_blockout_dates(blockout_date);

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings;

-- Insert default service categories
INSERT INTO public.service_categories (name, icon, display_order) VALUES
('Beauty & Wellness', '💆', 1),
('Home Services', '🏠', 2),
('Professional Services', '💼', 3),
('Health & Fitness', '🏋️', 4),
('Education & Tutoring', '📚', 5),
('Events & Entertainment', '🎉', 6),
('Tech & IT Services', '💻', 7),
('Other Services', '🔧', 8);