-- Inventory table for stock tracking
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id) ON DELETE CASCADE,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100) UNIQUE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 5,
  max_stock_level INTEGER DEFAULT 1000,
  reorder_point INTEGER DEFAULT 10,
  location VARCHAR(255),
  notes TEXT,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_product_or_food CHECK (
    (product_id IS NOT NULL AND food_item_id IS NULL) OR 
    (product_id IS NULL AND food_item_id IS NOT NULL)
  )
);

-- Stock movements/transactions table
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  movement_type VARCHAR(50) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer'
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type VARCHAR(50), -- 'order', 'replenishment', 'manual', 'return'
  reference_id UUID,
  notes TEXT,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivery trucks/vehicles table
CREATE TABLE public.delivery_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_name VARCHAR(255) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL, -- 'truck', 'van', 'motorcycle', 'bicycle'
  plate_number VARCHAR(50) UNIQUE,
  capacity_kg DECIMAL(10,2),
  capacity_volume_cbm DECIMAL(10,2),
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'retired'
  current_driver_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Delivery personnel table
CREATE TABLE public.delivery_personnel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  license_number VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'available', -- 'available', 'on_delivery', 'off_duty', 'suspended'
  assigned_vehicle_id UUID REFERENCES public.delivery_vehicles(id) ON DELETE SET NULL,
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Packing/shipping labels table
CREATE TABLE public.packing_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  label_type VARCHAR(50) NOT NULL DEFAULT 'shipping', -- 'shipping', 'product', 'package'
  barcode VARCHAR(100) NOT NULL,
  qr_code_data TEXT,
  printed_at TIMESTAMP WITH TIME ZONE,
  printed_by UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'printed', 'applied'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock replenishment requests
CREATE TABLE public.stock_replenishment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  requested_quantity INTEGER NOT NULL,
  approved_quantity INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'ordered', 'received', 'cancelled'
  requested_by UUID,
  approved_by UUID,
  supplier_name VARCHAR(255),
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packing_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_replenishment ENABLE ROW LEVEL SECURITY;

-- Admin-only policies (using has_role function)
CREATE POLICY "Admin can manage inventory" ON public.inventory FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can manage stock movements" ON public.stock_movements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can manage delivery vehicles" ON public.delivery_vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can manage delivery personnel" ON public.delivery_personnel FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can manage packing labels" ON public.packing_labels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin can manage stock replenishment" ON public.stock_replenishment FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create indexes for performance
CREATE INDEX idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX idx_inventory_food_item_id ON public.inventory(food_item_id);
CREATE INDEX idx_inventory_sku ON public.inventory(sku);
CREATE INDEX idx_inventory_barcode ON public.inventory(barcode);
CREATE INDEX idx_stock_movements_inventory_id ON public.stock_movements(inventory_id);
CREATE INDEX idx_packing_labels_order_id ON public.packing_labels(order_id);
CREATE INDEX idx_packing_labels_barcode ON public.packing_labels(barcode);