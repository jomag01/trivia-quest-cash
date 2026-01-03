-- =============================================
-- WAREHOUSE MANAGEMENT SYSTEM (WMS) SCHEMA
-- =============================================

-- Warehouse Role Enum
CREATE TYPE public.warehouse_role AS ENUM ('admin', 'manager', 'staff');

-- Inventory State Enum
CREATE TYPE public.inventory_state AS ENUM ('available', 'reserved', 'in_transit', 'damaged', 'returned', 'quarantine');

-- Transfer Status Enum
CREATE TYPE public.transfer_status AS ENUM ('pending', 'approved', 'dispatched', 'in_transit', 'received', 'cancelled');

-- Purchase Order Status Enum
CREATE TYPE public.po_status AS ENUM ('draft', 'pending', 'confirmed', 'partial', 'received', 'cancelled');

-- Fulfillment Status Enum
CREATE TYPE public.fulfillment_status AS ENUM ('pending', 'picking', 'picked', 'packing', 'packed', 'shipped', 'delivered', 'cancelled');

-- =============================================
-- WAREHOUSES TABLE
-- =============================================
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT,
    city TEXT,
    province TEXT,
    country TEXT DEFAULT 'Philippines',
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    is_central BOOLEAN DEFAULT false,
    capacity_units INTEGER DEFAULT 0,
    current_units INTEGER DEFAULT 0,
    manager_id UUID REFERENCES auth.users(id),
    contact_phone TEXT,
    contact_email TEXT,
    operating_hours JSONB DEFAULT '{"open": "08:00", "close": "18:00"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- WAREHOUSE STAFF TABLE
-- =============================================
CREATE TABLE public.warehouse_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    role warehouse_role NOT NULL DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    hired_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, warehouse_id)
);

-- =============================================
-- WAREHOUSE LOCATIONS (Zones, Aisles, Shelves, Bins)
-- =============================================
CREATE TABLE public.warehouse_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    location_code TEXT NOT NULL,
    zone TEXT,
    aisle TEXT,
    shelf TEXT,
    bin TEXT,
    location_type TEXT DEFAULT 'storage',
    is_pickable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    max_capacity INTEGER DEFAULT 100,
    current_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(warehouse_id, location_code)
);

-- =============================================
-- SKU MASTER TABLE
-- =============================================
CREATE TABLE public.sku_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID,
    seller_id UUID REFERENCES auth.users(id),
    supplier_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    barcode_ean TEXT,
    barcode_upc TEXT,
    qr_code TEXT,
    weight_kg DECIMAL(10, 3),
    dimensions_cm JSONB,
    unit_of_measure TEXT DEFAULT 'piece',
    is_serialized BOOLEAN DEFAULT false,
    is_lot_tracked BOOLEAN DEFAULT false,
    is_expirable BOOLEAN DEFAULT false,
    reorder_point INTEGER DEFAULT 10,
    reorder_quantity INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INVENTORY TABLE (Stock per Warehouse per SKU)
-- =============================================
CREATE TABLE public.warehouse_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.sku_master(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.warehouse_locations(id),
    lot_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    state inventory_state DEFAULT 'available',
    cost_per_unit DECIMAL(12, 2),
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(warehouse_id, sku_id, location_id, lot_number, serial_number)
);

-- =============================================
-- INVENTORY RESERVATIONS
-- =============================================
CREATE TABLE public.inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL REFERENCES public.warehouse_inventory(id) ON DELETE CASCADE,
    order_id UUID,
    order_item_id UUID,
    quantity INTEGER NOT NULL,
    reserved_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours'),
    released_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PURCHASE ORDERS (Supplier Inbound)
-- =============================================
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    supplier_id UUID NOT NULL REFERENCES auth.users(id),
    status po_status DEFAULT 'draft',
    expected_date DATE,
    received_date DATE,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    asn_number TEXT,
    invoice_url TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PURCHASE ORDER ITEMS
-- =============================================
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(12, 2),
    total_cost DECIMAL(12, 2),
    lot_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GOODS RECEIVING
-- =============================================
CREATE TABLE public.goods_receiving (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number TEXT NOT NULL UNIQUE,
    po_id UUID REFERENCES public.purchase_orders(id),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    supplier_id UUID REFERENCES auth.users(id),
    received_by UUID REFERENCES auth.users(id),
    received_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GOODS RECEIVING ITEMS
-- =============================================
CREATE TABLE public.goods_receiving_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL REFERENCES public.goods_receiving(id) ON DELETE CASCADE,
    po_item_id UUID REFERENCES public.purchase_order_items(id),
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    quantity_received INTEGER NOT NULL,
    quantity_damaged INTEGER DEFAULT 0,
    lot_number TEXT,
    serial_number TEXT,
    expiry_date DATE,
    condition TEXT DEFAULT 'good',
    barcode_scanned TEXT,
    scanned_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- WAREHOUSE TRANSFERS
-- =============================================
CREATE TABLE public.warehouse_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number TEXT NOT NULL UNIQUE,
    from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    status transfer_status DEFAULT 'pending',
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    dispatched_by UUID REFERENCES auth.users(id),
    received_by UUID REFERENCES auth.users(id),
    requested_at TIMESTAMPTZ DEFAULT now(),
    approved_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- WAREHOUSE TRANSFER ITEMS
-- =============================================
CREATE TABLE public.warehouse_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.warehouse_transfers(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    from_location_id UUID REFERENCES public.warehouse_locations(id),
    to_location_id UUID REFERENCES public.warehouse_locations(id),
    quantity_requested INTEGER NOT NULL,
    quantity_dispatched INTEGER DEFAULT 0,
    quantity_received INTEGER DEFAULT 0,
    lot_number TEXT,
    serial_number TEXT,
    barcode_verified_dispatch BOOLEAN DEFAULT false,
    barcode_verified_receive BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FULFILLMENT ORDERS (Pick/Pack/Ship)
-- =============================================
CREATE TABLE public.fulfillment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    seller_id UUID REFERENCES auth.users(id),
    status fulfillment_status DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    assigned_picker UUID REFERENCES auth.users(id),
    assigned_packer UUID REFERENCES auth.users(id),
    picked_at TIMESTAMPTZ,
    packed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    tracking_number TEXT,
    courier TEXT,
    shipping_label_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FULFILLMENT ORDER ITEMS (Pick List)
-- =============================================
CREATE TABLE public.fulfillment_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fulfillment_id UUID NOT NULL REFERENCES public.fulfillment_orders(id) ON DELETE CASCADE,
    order_item_id UUID,
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    inventory_id UUID REFERENCES public.warehouse_inventory(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    quantity_ordered INTEGER NOT NULL,
    quantity_picked INTEGER DEFAULT 0,
    quantity_packed INTEGER DEFAULT 0,
    barcode_scanned TEXT,
    picked_at TIMESTAMPTZ,
    packed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RETURNS MANAGEMENT
-- =============================================
CREATE TABLE public.warehouse_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_number TEXT NOT NULL UNIQUE,
    order_id UUID,
    fulfillment_id UUID REFERENCES public.fulfillment_orders(id),
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    customer_id UUID REFERENCES auth.users(id),
    seller_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pending',
    reason TEXT,
    condition TEXT,
    is_resellable BOOLEAN,
    refund_amount DECIMAL(12, 2),
    received_by UUID REFERENCES auth.users(id),
    received_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RETURNS ITEMS
-- =============================================
CREATE TABLE public.warehouse_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES public.warehouse_returns(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    quantity INTEGER NOT NULL,
    condition TEXT DEFAULT 'unknown',
    is_restocked BOOLEAN DEFAULT false,
    restock_location_id UUID REFERENCES public.warehouse_locations(id),
    barcode_scanned TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INVENTORY AUDIT LOG
-- =============================================
CREATE TABLE public.inventory_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id),
    sku_id UUID REFERENCES public.sku_master(id),
    inventory_id UUID REFERENCES public.warehouse_inventory(id),
    action TEXT NOT NULL,
    quantity_before INTEGER,
    quantity_after INTEGER,
    reason TEXT,
    reference_type TEXT,
    reference_id UUID,
    performed_by UUID REFERENCES auth.users(id),
    ip_address TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- STOCK ALERTS
-- =============================================
CREATE TABLE public.stock_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id UUID REFERENCES public.warehouses(id),
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    seller_id UUID REFERENCES auth.users(id),
    alert_type TEXT NOT NULL,
    threshold INTEGER,
    current_level INTEGER,
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CYCLE COUNTS
-- =============================================
CREATE TABLE public.cycle_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    count_number TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
    location_id UUID REFERENCES public.warehouse_locations(id),
    status TEXT DEFAULT 'pending',
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    counted_by UUID REFERENCES auth.users(id),
    verified_by UUID REFERENCES auth.users(id),
    discrepancy_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CYCLE COUNT ITEMS
-- =============================================
CREATE TABLE public.cycle_count_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_count_id UUID NOT NULL REFERENCES public.cycle_counts(id) ON DELETE CASCADE,
    sku_id UUID NOT NULL REFERENCES public.sku_master(id),
    inventory_id UUID REFERENCES public.warehouse_inventory(id),
    expected_quantity INTEGER NOT NULL,
    counted_quantity INTEGER,
    variance INTEGER,
    barcode_scanned TEXT,
    counted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_count_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
$$;

-- Check if user is warehouse staff
CREATE OR REPLACE FUNCTION public.is_warehouse_staff(_warehouse_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.warehouse_staff
    WHERE user_id = auth.uid() 
    AND warehouse_id = _warehouse_id
    AND is_active = true
  )
$$;

-- Check if user is warehouse manager
CREATE OR REPLACE FUNCTION public.is_warehouse_manager(_warehouse_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.warehouse_staff
    WHERE user_id = auth.uid() 
    AND warehouse_id = _warehouse_id
    AND role IN ('admin', 'manager')
    AND is_active = true
  )
$$;

-- =============================================
-- RLS POLICIES - WAREHOUSES
-- =============================================
CREATE POLICY "Admins can manage all warehouses"
ON public.warehouses FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can view assigned warehouses"
ON public.warehouses FOR SELECT
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.warehouse_staff
    WHERE warehouse_id = warehouses.id
    AND user_id = auth.uid()
    AND is_active = true
  )
);

-- =============================================
-- RLS POLICIES - WAREHOUSE STAFF
-- =============================================
CREATE POLICY "Admins can manage all staff"
ON public.warehouse_staff FOR ALL
USING (public.is_admin());

CREATE POLICY "Managers can view their warehouse staff"
ON public.warehouse_staff FOR SELECT
USING (
  public.is_admin() OR
  public.is_warehouse_manager(warehouse_id)
);

-- =============================================
-- RLS POLICIES - LOCATIONS
-- =============================================
CREATE POLICY "Admins can manage all locations"
ON public.warehouse_locations FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can view warehouse locations"
ON public.warehouse_locations FOR SELECT
USING (
  public.is_admin() OR
  public.is_warehouse_staff(warehouse_id)
);

-- =============================================
-- RLS POLICIES - SKU MASTER
-- =============================================
CREATE POLICY "Admins can manage all SKUs"
ON public.sku_master FOR ALL
USING (public.is_admin());

CREATE POLICY "Sellers can manage own SKUs"
ON public.sku_master FOR ALL
USING (seller_id = auth.uid());

CREATE POLICY "Suppliers can view related SKUs"
ON public.sku_master FOR SELECT
USING (supplier_id = auth.uid());

CREATE POLICY "Staff can view SKUs"
ON public.sku_master FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.warehouse_staff
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- =============================================
-- RLS POLICIES - INVENTORY
-- =============================================
CREATE POLICY "Admins can manage all inventory"
ON public.warehouse_inventory FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage warehouse inventory"
ON public.warehouse_inventory FOR ALL
USING (public.is_warehouse_staff(warehouse_id));

CREATE POLICY "Sellers can view own inventory"
ON public.warehouse_inventory FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sku_master
    WHERE sku_master.id = warehouse_inventory.sku_id
    AND sku_master.seller_id = auth.uid()
  )
);

-- =============================================
-- RLS POLICIES - PURCHASE ORDERS
-- =============================================
CREATE POLICY "Admins can manage all POs"
ON public.purchase_orders FOR ALL
USING (public.is_admin());

CREATE POLICY "Managers can manage warehouse POs"
ON public.purchase_orders FOR ALL
USING (public.is_warehouse_manager(warehouse_id));

CREATE POLICY "Suppliers can view own POs"
ON public.purchase_orders FOR SELECT
USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can update own POs"
ON public.purchase_orders FOR UPDATE
USING (supplier_id = auth.uid() AND status IN ('pending', 'confirmed'));

-- =============================================
-- RLS POLICIES - PURCHASE ORDER ITEMS
-- =============================================
CREATE POLICY "Admins can manage all PO items"
ON public.purchase_order_items FOR ALL
USING (public.is_admin());

CREATE POLICY "Access PO items via PO"
ON public.purchase_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE id = purchase_order_items.po_id
    AND (
      public.is_admin() OR
      public.is_warehouse_manager(warehouse_id) OR
      supplier_id = auth.uid()
    )
  )
);

-- =============================================
-- RLS POLICIES - GOODS RECEIVING
-- =============================================
CREATE POLICY "Admins can manage all GRN"
ON public.goods_receiving FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage warehouse GRN"
ON public.goods_receiving FOR ALL
USING (public.is_warehouse_staff(warehouse_id));

-- =============================================
-- RLS POLICIES - GOODS RECEIVING ITEMS
-- =============================================
CREATE POLICY "Admins can manage all GRN items"
ON public.goods_receiving_items FOR ALL
USING (public.is_admin());

CREATE POLICY "Access GRN items via GRN"
ON public.goods_receiving_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.goods_receiving
    WHERE id = goods_receiving_items.grn_id
    AND public.is_warehouse_staff(warehouse_id)
  )
);

-- =============================================
-- RLS POLICIES - TRANSFERS
-- =============================================
CREATE POLICY "Admins can manage all transfers"
ON public.warehouse_transfers FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage related transfers"
ON public.warehouse_transfers FOR ALL
USING (
  public.is_warehouse_staff(from_warehouse_id) OR
  public.is_warehouse_staff(to_warehouse_id)
);

-- =============================================
-- RLS POLICIES - TRANSFER ITEMS
-- =============================================
CREATE POLICY "Admins can manage all transfer items"
ON public.warehouse_transfer_items FOR ALL
USING (public.is_admin());

CREATE POLICY "Access transfer items via transfer"
ON public.warehouse_transfer_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.warehouse_transfers
    WHERE id = warehouse_transfer_items.transfer_id
    AND (
      public.is_warehouse_staff(from_warehouse_id) OR
      public.is_warehouse_staff(to_warehouse_id)
    )
  )
);

-- =============================================
-- RLS POLICIES - FULFILLMENT
-- =============================================
CREATE POLICY "Admins can manage all fulfillment"
ON public.fulfillment_orders FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage warehouse fulfillment"
ON public.fulfillment_orders FOR ALL
USING (public.is_warehouse_staff(warehouse_id));

CREATE POLICY "Sellers can view own fulfillment"
ON public.fulfillment_orders FOR SELECT
USING (seller_id = auth.uid());

-- =============================================
-- RLS POLICIES - FULFILLMENT ITEMS
-- =============================================
CREATE POLICY "Admins can manage all fulfillment items"
ON public.fulfillment_order_items FOR ALL
USING (public.is_admin());

CREATE POLICY "Access fulfillment items via fulfillment"
ON public.fulfillment_order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.fulfillment_orders
    WHERE id = fulfillment_order_items.fulfillment_id
    AND (public.is_admin() OR public.is_warehouse_staff(warehouse_id) OR seller_id = auth.uid())
  )
);

-- =============================================
-- RLS POLICIES - RETURNS
-- =============================================
CREATE POLICY "Admins can manage all returns"
ON public.warehouse_returns FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage warehouse returns"
ON public.warehouse_returns FOR ALL
USING (public.is_warehouse_staff(warehouse_id));

CREATE POLICY "Sellers can view own returns"
ON public.warehouse_returns FOR SELECT
USING (seller_id = auth.uid());

-- =============================================
-- RLS POLICIES - RETURN ITEMS
-- =============================================
CREATE POLICY "Admins can manage all return items"
ON public.warehouse_return_items FOR ALL
USING (public.is_admin());

CREATE POLICY "Access return items via return"
ON public.warehouse_return_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.warehouse_returns
    WHERE id = warehouse_return_items.return_id
    AND (public.is_admin() OR public.is_warehouse_staff(warehouse_id) OR seller_id = auth.uid())
  )
);

-- =============================================
-- RLS POLICIES - AUDIT LOG
-- =============================================
CREATE POLICY "Admins can view all audit logs"
ON public.inventory_audit_log FOR SELECT
USING (public.is_admin());

CREATE POLICY "Managers can view warehouse audit logs"
ON public.inventory_audit_log FOR SELECT
USING (public.is_warehouse_manager(warehouse_id));

CREATE POLICY "Anyone can insert audit logs"
ON public.inventory_audit_log FOR INSERT
WITH CHECK (true);

-- =============================================
-- RLS POLICIES - STOCK ALERTS
-- =============================================
CREATE POLICY "Admins can manage all alerts"
ON public.stock_alerts FOR ALL
USING (public.is_admin());

CREATE POLICY "Sellers can view own alerts"
ON public.stock_alerts FOR SELECT
USING (seller_id = auth.uid());

CREATE POLICY "Staff can view warehouse alerts"
ON public.stock_alerts FOR SELECT
USING (public.is_warehouse_staff(warehouse_id));

-- =============================================
-- RLS POLICIES - CYCLE COUNTS
-- =============================================
CREATE POLICY "Admins can manage all cycle counts"
ON public.cycle_counts FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage warehouse cycle counts"
ON public.cycle_counts FOR ALL
USING (public.is_warehouse_staff(warehouse_id));

-- =============================================
-- RLS POLICIES - CYCLE COUNT ITEMS
-- =============================================
CREATE POLICY "Admins can manage all cycle count items"
ON public.cycle_count_items FOR ALL
USING (public.is_admin());

CREATE POLICY "Access cycle count items via cycle count"
ON public.cycle_count_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.cycle_counts
    WHERE id = cycle_count_items.cycle_count_id
    AND public.is_warehouse_staff(warehouse_id)
  )
);

-- =============================================
-- RLS POLICIES - INVENTORY RESERVATIONS
-- =============================================
CREATE POLICY "Admins can manage all reservations"
ON public.inventory_reservations FOR ALL
USING (public.is_admin());

CREATE POLICY "Staff can manage inventory reservations"
ON public.inventory_reservations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.warehouse_inventory wi
    WHERE wi.id = inventory_reservations.inventory_id
    AND public.is_warehouse_staff(wi.warehouse_id)
  )
);

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fulfillment_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warehouse_transfers;

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_warehouse_inventory_sku ON public.warehouse_inventory(sku_id);
CREATE INDEX idx_warehouse_inventory_warehouse ON public.warehouse_inventory(warehouse_id);
CREATE INDEX idx_warehouse_inventory_state ON public.warehouse_inventory(state);
CREATE INDEX idx_sku_master_seller ON public.sku_master(seller_id);
CREATE INDEX idx_sku_master_supplier ON public.sku_master(supplier_id);
CREATE INDEX idx_sku_master_barcode ON public.sku_master(barcode_ean, barcode_upc);
CREATE INDEX idx_fulfillment_orders_status ON public.fulfillment_orders(status);
CREATE INDEX idx_fulfillment_orders_warehouse ON public.fulfillment_orders(warehouse_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_warehouse_staff_user ON public.warehouse_staff(user_id);
CREATE INDEX idx_stock_alerts_seller ON public.stock_alerts(seller_id);
CREATE INDEX idx_audit_log_sku ON public.inventory_audit_log(sku_id);
CREATE INDEX idx_audit_log_warehouse ON public.inventory_audit_log(warehouse_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_wms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_warehouse_staff_updated_at
  BEFORE UPDATE ON public.warehouse_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_sku_master_updated_at
  BEFORE UPDATE ON public.sku_master
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_warehouse_inventory_updated_at
  BEFORE UPDATE ON public.warehouse_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_warehouse_transfers_updated_at
  BEFORE UPDATE ON public.warehouse_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_fulfillment_orders_updated_at
  BEFORE UPDATE ON public.fulfillment_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();

CREATE TRIGGER update_warehouse_returns_updated_at
  BEFORE UPDATE ON public.warehouse_returns
  FOR EACH ROW EXECUTE FUNCTION public.update_wms_updated_at();