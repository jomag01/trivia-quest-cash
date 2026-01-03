import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  province?: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_central: boolean;
  capacity_units: number;
  current_units: number;
  manager_id?: string;
  contact_phone?: string;
  contact_email?: string;
  operating_hours?: { open: string; close: string };
  created_at: string;
  updated_at: string;
}

export interface SKU {
  id: string;
  sku: string;
  product_id?: string;
  variant_id?: string;
  seller_id?: string;
  supplier_id?: string;
  name: string;
  description?: string;
  barcode_ean?: string;
  barcode_upc?: string;
  qr_code?: string;
  weight_kg?: number;
  dimensions_cm?: { length: number; width: number; height: number };
  unit_of_measure: string;
  is_serialized: boolean;
  is_lot_tracked: boolean;
  is_expirable: boolean;
  reorder_point: number;
  reorder_quantity: number;
  created_at: string;
  updated_at: string;
}

export interface WarehouseInventory {
  id: string;
  warehouse_id: string;
  sku_id: string;
  location_id?: string;
  lot_number?: string;
  serial_number?: string;
  expiry_date?: string;
  quantity: number;
  reserved_quantity: number;
  state: 'available' | 'reserved' | 'in_transit' | 'damaged' | 'returned' | 'quarantine';
  cost_per_unit?: number;
  received_at?: string;
  created_at: string;
  updated_at: string;
  sku?: SKU;
  warehouse?: Warehouse;
}

export interface FulfillmentOrder {
  id: string;
  fulfillment_number: string;
  order_id: string;
  warehouse_id: string;
  seller_id?: string;
  status: 'pending' | 'picking' | 'picked' | 'packing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  priority: number;
  assigned_picker?: string;
  assigned_packer?: string;
  picked_at?: string;
  packed_at?: string;
  shipped_at?: string;
  tracking_number?: string;
  courier?: string;
  shipping_label_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StockAlert {
  id: string;
  warehouse_id?: string;
  sku_id: string;
  seller_id?: string;
  alert_type: string;
  threshold?: number;
  current_level?: number;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
  sku?: SKU;
}

export function useWarehouses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!user,
  });
}

export function useWarehouseInventory(warehouseId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['warehouse-inventory', warehouseId],
    queryFn: async () => {
      let query = supabase
        .from('warehouse_inventory')
        .select(`
          *,
          sku:sku_master(*),
          warehouse:warehouses(*)
        `)
        .order('updated_at', { ascending: false });

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as WarehouseInventory[];
    },
    enabled: !!user,
  });
}

export function useSKUs(sellerId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['skus', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('sku_master')
        .select('*')
        .order('name');

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as SKU[];
    },
    enabled: !!user,
  });
}

export function useFulfillmentOrders(warehouseId?: string, status?: FulfillmentOrder['status']) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['fulfillment-orders', warehouseId, status],
    queryFn: async () => {
      let query = supabase
        .from('fulfillment_orders')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }
      if (status) {
        query = query.eq('status', status as any);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as FulfillmentOrder[];
    },
    enabled: !!user,
  });
}

export function useStockAlerts(sellerId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stock-alerts', sellerId],
    queryFn: async () => {
      let query = supabase
        .from('stock_alerts')
        .select(`
          *,
          sku:sku_master(*)
        `)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (sellerId) {
        query = query.eq('seller_id', sellerId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as StockAlert[];
    },
    enabled: !!user,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouse: Partial<Warehouse>) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert(warehouse as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create warehouse: ${error.message}`);
    },
  });
}

export function useCreateSKU() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sku: Partial<SKU>) => {
      const { data, error } = await supabase
        .from('sku_master')
        .insert(sku as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      toast.success('SKU created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SKU: ${error.message}`);
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WarehouseInventory> & { id: string }) => {
      const { data, error } = await supabase
        .from('warehouse_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] });
      toast.success('Inventory updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update inventory: ${error.message}`);
    },
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast.success('Alert acknowledged');
    },
  });
}

// Generate unique SKU
export function generateSKU(prefix: string = 'SKU'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Generate barcode (EAN-13 format)
export function generateEAN13(): string {
  const prefix = '893'; // Philippines country code
  const company = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  const product = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  const partial = prefix + company + product;
  
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(partial[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return partial + checkDigit;
}

// Generate QR code data
export function generateQRData(sku: string, warehouseCode: string): string {
  return JSON.stringify({
    sku,
    warehouse: warehouseCode,
    timestamp: new Date().toISOString(),
  });
}
