-- =============================================
-- TRIVIABEES COURIER & PARCEL DELIVERY SYSTEM
-- Full Database Schema for National-Scale Operations
-- =============================================

-- 1. COURIER ROLE TYPE
CREATE TYPE public.courier_role AS ENUM ('courier_admin', 'hub_manager', 'hub_staff', 'courier_rider', 'seller');

-- 2. SHIPMENT STATUS ENUM (State Machine)
CREATE TYPE public.shipment_status AS ENUM (
  'draft',
  'created',
  'pickup_scheduled',
  'pickup_assigned',
  'picked_up',
  'at_origin_hub',
  'sorting',
  'in_transit',
  'at_destination_hub',
  'out_for_delivery',
  'delivery_attempted',
  'delivered',
  'failed_delivery',
  'returning',
  'returned_to_sender',
  'lost',
  'damaged',
  'cancelled'
);

-- 3. PAYMENT STATUS ENUM
CREATE TYPE public.cod_status AS ENUM (
  'pending',
  'collected',
  'turned_over',
  'reconciled',
  'credited',
  'refunded'
);

-- 4. COURIER USER ROLES TABLE
CREATE TABLE public.courier_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role courier_role NOT NULL,
  hub_id UUID, -- assigned hub for hub_staff/hub_manager
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.courier_user_roles ENABLE ROW LEVEL SECURITY;

-- 5. COURIER ZONES TABLE (Geographic Regions)
CREATE TABLE public.courier_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_code TEXT NOT NULL UNIQUE,
  zone_name TEXT NOT NULL,
  region TEXT,
  province TEXT,
  city TEXT,
  barangay TEXT,
  zip_code TEXT,
  is_serviceable BOOLEAN DEFAULT true,
  delivery_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_zones ENABLE ROW LEVEL SECURITY;

-- 6. COURIER HUBS TABLE
CREATE TABLE public.courier_hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_code TEXT NOT NULL UNIQUE,
  hub_name TEXT NOT NULL,
  hub_type TEXT NOT NULL DEFAULT 'branch', -- 'main', 'branch', 'sorting_center'
  zone_id UUID REFERENCES public.courier_zones(id),
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  zip_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_phone TEXT,
  contact_email TEXT,
  manager_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  operating_hours JSONB, -- {"monday": {"open": "08:00", "close": "18:00"}, ...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_hubs ENABLE ROW LEVEL SECURITY;

-- 7. COURIER RIDERS TABLE (Extended rider profile for courier)
CREATE TABLE public.courier_riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  rider_code TEXT NOT NULL UNIQUE,
  hub_id UUID REFERENCES public.courier_hubs(id),
  vehicle_type TEXT, -- 'motorcycle', 'bicycle', 'van', 'truck'
  vehicle_plate TEXT,
  license_number TEXT,
  is_available BOOLEAN DEFAULT true,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  last_location_update TIMESTAMPTZ,
  max_parcels_capacity INTEGER DEFAULT 20,
  current_cash_on_hand DECIMAL(12, 2) DEFAULT 0,
  cash_limit DECIMAL(12, 2) DEFAULT 50000, -- PHP 50k default limit
  rating DECIMAL(3, 2) DEFAULT 5.00,
  total_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_riders ENABLE ROW LEVEL SECURITY;

-- 8. COURIER PRICING RULES TABLE
CREATE TABLE public.courier_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  origin_zone_id UUID REFERENCES public.courier_zones(id),
  destination_zone_id UUID REFERENCES public.courier_zones(id),
  min_weight_kg DECIMAL(10, 3) DEFAULT 0,
  max_weight_kg DECIMAL(10, 3) DEFAULT 1000,
  base_price DECIMAL(12, 2) NOT NULL,
  price_per_kg DECIMAL(12, 2) DEFAULT 0,
  volumetric_divisor INTEGER DEFAULT 6000,
  cod_fee_percent DECIMAL(5, 2) DEFAULT 2.00,
  cod_fee_minimum DECIMAL(12, 2) DEFAULT 25.00,
  insurance_percent DECIMAL(5, 2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_pricing_rules ENABLE ROW LEVEL SECURITY;

-- 9. SHIPMENTS TABLE (Main shipment/waybill record)
CREATE TABLE public.courier_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT NOT NULL UNIQUE,
  barcode_data TEXT,
  
  -- Order reference
  order_id UUID REFERENCES public.orders(id),
  
  -- Sender info
  seller_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_email TEXT,
  sender_address TEXT NOT NULL,
  sender_city TEXT NOT NULL,
  sender_province TEXT NOT NULL,
  sender_zip TEXT,
  sender_lat DECIMAL(10, 8),
  sender_lng DECIMAL(11, 8),
  
  -- Receiver info
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT NOT NULL,
  receiver_email TEXT,
  receiver_address TEXT NOT NULL,
  receiver_city TEXT NOT NULL,
  receiver_province TEXT NOT NULL,
  receiver_zip TEXT,
  receiver_lat DECIMAL(10, 8),
  receiver_lng DECIMAL(11, 8),
  
  -- Package details
  package_type TEXT DEFAULT 'parcel', -- 'parcel', 'document', 'fragile', 'bulky'
  description TEXT,
  actual_weight_kg DECIMAL(10, 3),
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  height_cm DECIMAL(10, 2),
  volumetric_weight_kg DECIMAL(10, 3),
  billable_weight_kg DECIMAL(10, 3),
  
  -- Pricing
  shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cod_amount DECIMAL(12, 2) DEFAULT 0,
  cod_fee DECIMAL(12, 2) DEFAULT 0,
  insurance_fee DECIMAL(12, 2) DEFAULT 0,
  declared_value DECIMAL(12, 2) DEFAULT 0,
  total_charges DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_cod BOOLEAN DEFAULT false,
  is_insured BOOLEAN DEFAULT false,
  
  -- Status
  status shipment_status NOT NULL DEFAULT 'created',
  cod_status cod_status DEFAULT 'pending',
  
  -- Hub assignments
  origin_hub_id UUID REFERENCES public.courier_hubs(id),
  destination_hub_id UUID REFERENCES public.courier_hubs(id),
  current_hub_id UUID REFERENCES public.courier_hubs(id),
  origin_zone_id UUID REFERENCES public.courier_zones(id),
  destination_zone_id UUID REFERENCES public.courier_zones(id),
  
  -- Rider assignments
  pickup_rider_id UUID REFERENCES public.courier_riders(id),
  delivery_rider_id UUID REFERENCES public.courier_riders(id),
  
  -- Scheduling
  pickup_scheduled_date DATE,
  pickup_scheduled_slot TEXT, -- 'morning', 'afternoon', 'evening'
  pickup_attempts INTEGER DEFAULT 0,
  delivery_attempts INTEGER DEFAULT 0,
  max_delivery_attempts INTEGER DEFAULT 3,
  
  -- Timestamps
  picked_up_at TIMESTAMPTZ,
  arrived_origin_hub_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  arrived_destination_hub_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  
  -- Proof of delivery
  pod_signature_url TEXT,
  pod_photo_url TEXT,
  pod_received_by TEXT,
  pod_relation TEXT,
  delivery_notes TEXT,
  
  -- Failure handling
  failure_reason TEXT,
  return_reason TEXT,
  
  -- Metadata
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;

-- 10. SHIPMENT TRACKING HISTORY
CREATE TABLE public.courier_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.courier_shipments(id) ON DELETE CASCADE,
  status shipment_status NOT NULL,
  event_type TEXT NOT NULL, -- 'status_change', 'scan', 'location_update', 'note'
  event_description TEXT NOT NULL,
  location TEXT,
  hub_id UUID REFERENCES public.courier_hubs(id),
  rider_id UUID REFERENCES public.courier_riders(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photo_url TEXT,
  scan_type TEXT, -- 'pickup', 'hub_in', 'hub_out', 'delivery'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_tracking_events ENABLE ROW LEVEL SECURITY;

-- 11. RIDER JOBS TABLE (Pickup & Delivery assignments)
CREATE TABLE public.courier_rider_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.courier_riders(id),
  shipment_id UUID NOT NULL REFERENCES public.courier_shipments(id),
  job_type TEXT NOT NULL, -- 'pickup', 'delivery'
  status TEXT NOT NULL DEFAULT 'assigned', -- 'assigned', 'accepted', 'in_progress', 'completed', 'failed', 'cancelled'
  priority INTEGER DEFAULT 0,
  
  -- Location
  target_lat DECIMAL(10, 8),
  target_lng DECIMAL(11, 8),
  target_address TEXT,
  
  -- Scheduling
  scheduled_date DATE,
  scheduled_slot TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- COD tracking
  cod_amount DECIMAL(12, 2) DEFAULT 0,
  cod_collected DECIMAL(12, 2) DEFAULT 0,
  
  -- Notes
  notes TEXT,
  failure_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_rider_jobs ENABLE ROW LEVEL SECURITY;

-- 12. HUB SCAN RECORDS (Multi-scan history)
CREATE TABLE public.courier_hub_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.courier_shipments(id) ON DELETE CASCADE,
  hub_id UUID NOT NULL REFERENCES public.courier_hubs(id),
  scan_type TEXT NOT NULL, -- 'receive', 'sort', 'dispatch', 'return'
  scanned_by UUID REFERENCES auth.users(id),
  destination_hub_id UUID REFERENCES public.courier_hubs(id), -- for dispatch scans
  sort_zone_code TEXT,
  bag_number TEXT,
  linehaul_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_hub_scans ENABLE ROW LEVEL SECURITY;

-- 13. LINEHAUL TRIPS (Hub-to-hub transport)
CREATE TABLE public.courier_linehaul_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code TEXT NOT NULL UNIQUE,
  origin_hub_id UUID NOT NULL REFERENCES public.courier_hubs(id),
  destination_hub_id UUID NOT NULL REFERENCES public.courier_hubs(id),
  vehicle_plate TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'loading', 'in_transit', 'arrived', 'unloaded', 'completed'
  parcel_count INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10, 3) DEFAULT 0,
  scheduled_departure TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  scheduled_arrival TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  manifest_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_linehaul_trips ENABLE ROW LEVEL SECURITY;

-- 14. LINEHAUL TRIP PARCELS
CREATE TABLE public.courier_linehaul_parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linehaul_trip_id UUID NOT NULL REFERENCES public.courier_linehaul_trips(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.courier_shipments(id),
  bag_number TEXT,
  loaded_at TIMESTAMPTZ,
  unloaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_linehaul_parcels ENABLE ROW LEVEL SECURITY;

-- 15. COD TRANSACTIONS
CREATE TABLE public.courier_cod_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES public.courier_shipments(id),
  transaction_type TEXT NOT NULL, -- 'collection', 'turnover', 'reconciliation', 'credit', 'refund'
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Party references
  rider_id UUID REFERENCES public.courier_riders(id),
  hub_id UUID REFERENCES public.courier_hubs(id),
  seller_id UUID REFERENCES auth.users(id),
  
  -- Turnover details
  cash_received DECIMAL(12, 2),
  cash_returned DECIMAL(12, 2),
  reference_number TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'disputed', 'resolved'
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_cod_transactions ENABLE ROW LEVEL SECURITY;

-- 16. RIDER CASH TURNOVERS
CREATE TABLE public.courier_rider_turnovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID NOT NULL REFERENCES public.courier_riders(id),
  hub_id UUID NOT NULL REFERENCES public.courier_hubs(id),
  turnover_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Amounts
  expected_amount DECIMAL(12, 2) NOT NULL,
  actual_amount DECIMAL(12, 2) NOT NULL,
  discrepancy DECIMAL(12, 2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  
  -- Shipment count
  shipment_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'disputed', 'resolved'
  discrepancy_reason TEXT,
  resolution_notes TEXT,
  
  received_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_rider_turnovers ENABLE ROW LEVEL SECURITY;

-- 17. SELLER COURIER WALLETS
CREATE TABLE public.courier_seller_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  available_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  pending_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_credited DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_withdrawn DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_seller_wallets ENABLE ROW LEVEL SECURITY;

-- 18. COURIER WALLET TRANSACTIONS
CREATE TABLE public.courier_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.courier_seller_wallets(id),
  seller_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_type TEXT NOT NULL, -- 'cod_credit', 'withdrawal', 'refund', 'adjustment', 'shipping_debit'
  amount DECIMAL(12, 2) NOT NULL,
  balance_before DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  shipment_id UUID REFERENCES public.courier_shipments(id),
  reference_number TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_wallet_transactions ENABLE ROW LEVEL SECURITY;

-- 19. COURIER NOTIFICATIONS
CREATE TABLE public.courier_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  shipment_id UUID REFERENCES public.courier_shipments(id),
  notification_type TEXT NOT NULL, -- 'sms', 'email', 'push', 'in_app'
  template_key TEXT NOT NULL,
  recipient TEXT NOT NULL, -- phone or email
  content TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_notifications ENABLE ROW LEVEL SECURITY;

-- 20. COURIER AUDIT LOGS
CREATE TABLE public.courier_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'shipment', 'rider', 'hub', 'cod', 'wallet'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change'
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courier_audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_shipments_tracking ON public.courier_shipments(tracking_number);
CREATE INDEX idx_shipments_status ON public.courier_shipments(status);
CREATE INDEX idx_shipments_seller ON public.courier_shipments(seller_id);
CREATE INDEX idx_shipments_order ON public.courier_shipments(order_id);
CREATE INDEX idx_shipments_origin_hub ON public.courier_shipments(origin_hub_id);
CREATE INDEX idx_shipments_dest_hub ON public.courier_shipments(destination_hub_id);
CREATE INDEX idx_shipments_pickup_rider ON public.courier_shipments(pickup_rider_id);
CREATE INDEX idx_shipments_delivery_rider ON public.courier_shipments(delivery_rider_id);
CREATE INDEX idx_shipments_created ON public.courier_shipments(created_at);

CREATE INDEX idx_tracking_shipment ON public.courier_tracking_events(shipment_id);
CREATE INDEX idx_tracking_created ON public.courier_tracking_events(created_at);

CREATE INDEX idx_rider_jobs_rider ON public.courier_rider_jobs(rider_id);
CREATE INDEX idx_rider_jobs_status ON public.courier_rider_jobs(status);
CREATE INDEX idx_rider_jobs_date ON public.courier_rider_jobs(scheduled_date);

CREATE INDEX idx_hub_scans_shipment ON public.courier_hub_scans(shipment_id);
CREATE INDEX idx_hub_scans_hub ON public.courier_hub_scans(hub_id);

CREATE INDEX idx_cod_transactions_shipment ON public.courier_cod_transactions(shipment_id);
CREATE INDEX idx_cod_transactions_rider ON public.courier_cod_transactions(rider_id);

CREATE INDEX idx_wallet_transactions_seller ON public.courier_wallet_transactions(seller_id);

CREATE INDEX idx_audit_logs_entity ON public.courier_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.courier_audit_logs(created_at);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Check courier role
CREATE OR REPLACE FUNCTION public.has_courier_role(_user_id UUID, _role courier_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courier_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is courier admin
CREATE OR REPLACE FUNCTION public.is_courier_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_courier_role(_user_id, 'courier_admin') 
    OR public.has_role(_user_id, 'admin')
$$;

-- Generate tracking number
CREATE OR REPLACE FUNCTION public.generate_tracking_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT := 'TRV';
  timestamp_part TEXT;
  random_part TEXT;
  tracking TEXT;
BEGIN
  timestamp_part := to_char(now(), 'YYMMDD');
  random_part := upper(substr(md5(random()::text), 1, 8));
  tracking := prefix || timestamp_part || random_part;
  RETURN tracking;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Courier User Roles
CREATE POLICY "Admins can manage courier roles" ON public.courier_user_roles
FOR ALL USING (public.is_courier_admin(auth.uid()));

CREATE POLICY "Users can view own roles" ON public.courier_user_roles
FOR SELECT USING (auth.uid() = user_id);

-- Zones (public read)
CREATE POLICY "Anyone can view zones" ON public.courier_zones
FOR SELECT USING (true);

CREATE POLICY "Admins can manage zones" ON public.courier_zones
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Hubs
CREATE POLICY "Anyone can view active hubs" ON public.courier_hubs
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage hubs" ON public.courier_hubs
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Courier Riders
CREATE POLICY "Riders can view and update own profile" ON public.courier_riders
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Hub staff can view hub riders" ON public.courier_riders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courier_user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('hub_manager', 'hub_staff')
    AND hub_id = courier_riders.hub_id
  )
);

CREATE POLICY "Admins can manage riders" ON public.courier_riders
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Pricing Rules
CREATE POLICY "Sellers can view pricing" ON public.courier_pricing_rules
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage pricing" ON public.courier_pricing_rules
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Shipments
CREATE POLICY "Sellers can view own shipments" ON public.courier_shipments
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create shipments" ON public.courier_shipments
FOR INSERT WITH CHECK (auth.uid() = seller_id OR auth.uid() = created_by);

CREATE POLICY "Riders can view assigned shipments" ON public.courier_shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courier_riders WHERE user_id = auth.uid() 
    AND id IN (courier_shipments.pickup_rider_id, courier_shipments.delivery_rider_id)
  )
);

CREATE POLICY "Hub staff can view hub shipments" ON public.courier_shipments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courier_user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('hub_manager', 'hub_staff')
    AND hub_id IN (
      courier_shipments.origin_hub_id, 
      courier_shipments.destination_hub_id, 
      courier_shipments.current_hub_id
    )
  )
);

CREATE POLICY "Admins can manage all shipments" ON public.courier_shipments
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Tracking Events (public read for shipment tracking)
CREATE POLICY "Anyone can view tracking events" ON public.courier_tracking_events
FOR SELECT USING (true);

CREATE POLICY "Staff can create tracking events" ON public.courier_tracking_events
FOR INSERT WITH CHECK (
  public.is_courier_admin(auth.uid()) 
  OR EXISTS (SELECT 1 FROM public.courier_user_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.courier_riders WHERE user_id = auth.uid())
);

-- Rider Jobs
CREATE POLICY "Riders can view own jobs" ON public.courier_rider_jobs
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courier_riders WHERE user_id = auth.uid() AND id = courier_rider_jobs.rider_id)
);

CREATE POLICY "Riders can update own jobs" ON public.courier_rider_jobs
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.courier_riders WHERE user_id = auth.uid() AND id = courier_rider_jobs.rider_id)
);

CREATE POLICY "Admins can manage jobs" ON public.courier_rider_jobs
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Hub Scans
CREATE POLICY "Hub staff can create scans" ON public.courier_hub_scans
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courier_user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('hub_manager', 'hub_staff', 'courier_admin')
  )
);

CREATE POLICY "Staff can view scans" ON public.courier_hub_scans
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courier_user_roles WHERE user_id = auth.uid())
);

-- Linehaul Trips
CREATE POLICY "Staff can view linehaul trips" ON public.courier_linehaul_trips
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courier_user_roles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage linehaul trips" ON public.courier_linehaul_trips
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Linehaul Parcels
CREATE POLICY "Staff can manage linehaul parcels" ON public.courier_linehaul_parcels
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courier_user_roles WHERE user_id = auth.uid())
);

-- COD Transactions
CREATE POLICY "Sellers can view own COD" ON public.courier_cod_transactions
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Riders can view own COD" ON public.courier_cod_transactions
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courier_riders WHERE user_id = auth.uid() AND id = courier_cod_transactions.rider_id)
);

CREATE POLICY "Staff can manage COD" ON public.courier_cod_transactions
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courier_user_roles WHERE user_id = auth.uid())
);

-- Rider Turnovers
CREATE POLICY "Riders can view own turnovers" ON public.courier_rider_turnovers
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courier_riders WHERE user_id = auth.uid() AND id = courier_rider_turnovers.rider_id)
);

CREATE POLICY "Hub staff can manage turnovers" ON public.courier_rider_turnovers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.courier_user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('hub_manager', 'hub_staff', 'courier_admin')
    AND hub_id = courier_rider_turnovers.hub_id
  )
);

-- Seller Wallets
CREATE POLICY "Sellers can view own wallet" ON public.courier_seller_wallets
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage wallets" ON public.courier_seller_wallets
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Wallet Transactions
CREATE POLICY "Sellers can view own transactions" ON public.courier_wallet_transactions
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Admins can manage transactions" ON public.courier_wallet_transactions
FOR ALL USING (public.is_courier_admin(auth.uid()));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.courier_notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON public.courier_notifications
FOR INSERT WITH CHECK (true);

-- Audit Logs (admin only)
CREATE POLICY "Admins can view audit logs" ON public.courier_audit_logs
FOR SELECT USING (public.is_courier_admin(auth.uid()));

CREATE POLICY "System can create audit logs" ON public.courier_audit_logs
FOR INSERT WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-generate tracking number
-- =============================================
CREATE OR REPLACE FUNCTION public.set_tracking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := generate_tracking_number();
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM courier_shipments WHERE tracking_number = NEW.tracking_number) LOOP
      NEW.tracking_number := generate_tracking_number();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_tracking_number
BEFORE INSERT ON public.courier_shipments
FOR EACH ROW EXECUTE FUNCTION public.set_tracking_number();

-- =============================================
-- TRIGGER: Create initial tracking event
-- =============================================
CREATE OR REPLACE FUNCTION public.create_shipment_tracking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO courier_tracking_events (
    shipment_id, status, event_type, event_description, created_by
  ) VALUES (
    NEW.id, NEW.status, 'status_change', 'Shipment created', NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_shipment_event
AFTER INSERT ON public.courier_shipments
FOR EACH ROW EXECUTE FUNCTION public.create_shipment_tracking_event();

-- =============================================
-- TRIGGER: Log status changes
-- =============================================
CREATE OR REPLACE FUNCTION public.log_shipment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO courier_tracking_events (
      shipment_id, status, event_type, event_description,
      hub_id, rider_id
    ) VALUES (
      NEW.id, NEW.status, 'status_change',
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      NEW.current_hub_id,
      CASE 
        WHEN NEW.status = 'picked_up' THEN NEW.pickup_rider_id
        WHEN NEW.status IN ('out_for_delivery', 'delivered', 'failed_delivery') THEN NEW.delivery_rider_id
        ELSE NULL
      END
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_log_status_change
AFTER UPDATE ON public.courier_shipments
FOR EACH ROW EXECUTE FUNCTION public.log_shipment_status_change();

-- =============================================
-- TRIGGER: Update seller wallet on COD credit
-- =============================================
CREATE OR REPLACE FUNCTION public.process_cod_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(12, 2);
BEGIN
  IF NEW.transaction_type = 'credit' AND NEW.status = 'completed' THEN
    -- Get or create wallet
    SELECT id, available_balance INTO v_wallet_id, v_current_balance
    FROM courier_seller_wallets WHERE seller_id = NEW.seller_id;
    
    IF v_wallet_id IS NULL THEN
      INSERT INTO courier_seller_wallets (seller_id, available_balance)
      VALUES (NEW.seller_id, NEW.amount)
      RETURNING id, available_balance INTO v_wallet_id, v_current_balance;
    ELSE
      UPDATE courier_seller_wallets
      SET available_balance = available_balance + NEW.amount,
          total_credited = total_credited + NEW.amount,
          updated_at = now()
      WHERE id = v_wallet_id
      RETURNING available_balance INTO v_current_balance;
    END IF;
    
    -- Log transaction
    INSERT INTO courier_wallet_transactions (
      wallet_id, seller_id, transaction_type, amount,
      balance_before, balance_after, shipment_id, description
    ) VALUES (
      v_wallet_id, NEW.seller_id, 'cod_credit', NEW.amount,
      v_current_balance - NEW.amount, v_current_balance, NEW.shipment_id,
      'COD credited for shipment'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_process_cod_credit
AFTER INSERT ON public.courier_cod_transactions
FOR EACH ROW EXECUTE FUNCTION public.process_cod_credit();

-- =============================================
-- Enable realtime for key tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_tracking_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_rider_jobs;