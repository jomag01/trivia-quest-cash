-- Create food_categories table
CREATE TABLE public.food_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create food_vendors table
CREATE TABLE public.food_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  cuisine_type TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  category_id UUID REFERENCES public.food_categories(id),
  is_active BOOLEAN DEFAULT true,
  is_open BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  estimated_delivery_time TEXT DEFAULT '30-45 min',
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  minimum_order DECIMAL(10,2) DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create food_menus table for restaurant menus (max 3 for unqualified)
CREATE TABLE public.food_menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create food_items table
CREATE TABLE public.food_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.food_vendors(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES public.food_menus(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  preparation_time TEXT DEFAULT '15-20 min',
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  diamond_reward INT DEFAULT 0,
  referral_commission_diamonds INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create food_orders table
CREATE TABLE public.food_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.food_vendors(id),
  status TEXT DEFAULT 'pending',
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  diamond_reward INT DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  delivery_address TEXT,
  delivery_latitude DOUBLE PRECISION,
  delivery_longitude DOUBLE PRECISION,
  notes TEXT,
  referrer_id UUID,
  payment_method TEXT DEFAULT 'cod',
  paid_with_credits BOOLEAN DEFAULT false,
  rider_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create food_order_items table
CREATE TABLE public.food_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.food_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.food_items(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery_riders table
CREATE TABLE public.delivery_riders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  vehicle_type TEXT,
  license_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  is_available BOOLEAN DEFAULT false,
  total_deliveries INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.00,
  admin_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery_assignments table
CREATE TABLE public.delivery_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.food_orders(id),
  rider_id UUID NOT NULL REFERENCES public.delivery_riders(id),
  vendor_id UUID NOT NULL REFERENCES public.food_vendors(id),
  status TEXT NOT NULL DEFAULT 'assigned',
  rider_credits_deducted DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  customer_latitude DOUBLE PRECISION,
  customer_longitude DOUBLE PRECISION,
  pickup_address TEXT,
  pickup_latitude DOUBLE PRECISION,
  pickup_longitude DOUBLE PRECISION,
  distance_km DECIMAL(6,2),
  estimated_time_minutes INT,
  picked_up_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for food_categories
CREATE POLICY "Anyone can view active categories" ON public.food_categories FOR SELECT USING (is_active = true);

-- RLS policies for food_vendors
CREATE POLICY "Anyone can view approved vendors" ON public.food_vendors FOR SELECT USING (approval_status = 'approved' AND is_active = true);
CREATE POLICY "Users can view their own vendor" ON public.food_vendors FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can create their own vendor" ON public.food_vendors FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update their own vendor" ON public.food_vendors FOR UPDATE USING (owner_id = auth.uid());

-- RLS policies for food_menus
CREATE POLICY "Anyone can view active menus" ON public.food_menus FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors can manage their menus" ON public.food_menus FOR ALL USING (
  EXISTS (SELECT 1 FROM food_vendors WHERE id = vendor_id AND owner_id = auth.uid())
);

-- RLS policies for food_items
CREATE POLICY "Anyone can view available items" ON public.food_items FOR SELECT USING (is_available = true);
CREATE POLICY "Vendors can manage their items" ON public.food_items FOR ALL USING (
  EXISTS (SELECT 1 FROM food_vendors WHERE id = vendor_id AND owner_id = auth.uid())
);

-- RLS policies for food_orders
CREATE POLICY "Customers can view their orders" ON public.food_orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can create orders" ON public.food_orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Vendors can view their orders" ON public.food_orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM food_vendors WHERE id = vendor_id AND owner_id = auth.uid())
);
CREATE POLICY "Vendors can update their orders" ON public.food_orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM food_vendors WHERE id = vendor_id AND owner_id = auth.uid())
);

-- RLS policies for food_order_items
CREATE POLICY "Users can view order items" ON public.food_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM food_orders WHERE id = order_id AND (customer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM food_vendors WHERE id = food_orders.vendor_id AND owner_id = auth.uid())))
);
CREATE POLICY "Users can insert order items" ON public.food_order_items FOR INSERT WITH CHECK (true);

-- RLS policies for delivery_riders
CREATE POLICY "Users can view their rider profile" ON public.delivery_riders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create rider application" ON public.delivery_riders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their rider profile" ON public.delivery_riders FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Vendors can view approved riders" ON public.delivery_riders FOR SELECT USING (status = 'approved');

-- RLS policies for delivery_assignments
CREATE POLICY "Riders view their assignments" ON public.delivery_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM delivery_riders WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Riders update their assignments" ON public.delivery_assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM delivery_riders WHERE id = rider_id AND user_id = auth.uid())
);
CREATE POLICY "Vendors view order assignments" ON public.delivery_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM food_vendors WHERE id = vendor_id AND owner_id = auth.uid())
);
CREATE POLICY "Insert assignments" ON public.delivery_assignments FOR INSERT WITH CHECK (true);

-- Add is_verified_rider to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified_rider BOOLEAN DEFAULT false;

-- Create indexes
CREATE INDEX idx_food_vendors_owner ON public.food_vendors(owner_id);
CREATE INDEX idx_food_menus_vendor ON public.food_menus(vendor_id);
CREATE INDEX idx_food_items_vendor ON public.food_items(vendor_id);
CREATE INDEX idx_food_items_menu ON public.food_items(menu_id);
CREATE INDEX idx_food_orders_customer ON public.food_orders(customer_id);
CREATE INDEX idx_food_orders_vendor ON public.food_orders(vendor_id);
CREATE INDEX idx_delivery_riders_user ON public.delivery_riders(user_id);
CREATE INDEX idx_delivery_riders_status ON public.delivery_riders(status);
CREATE INDEX idx_delivery_assignments_rider ON public.delivery_assignments(rider_id);

-- Insert default food categories
INSERT INTO public.food_categories (name, icon, display_order) VALUES
('Fast Food', '🍔', 1),
('Filipino', '🍲', 2),
('Chinese', '🥡', 3),
('Japanese', '🍱', 4),
('Korean', '🍜', 5),
('Pizza', '🍕', 6),
('Desserts', '🍰', 7),
('Beverages', '🥤', 8);