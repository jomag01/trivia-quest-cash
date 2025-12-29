import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock,
  Printer,
  MapPin,
  Phone,
  Mail,
  User,
  Search,
  Filter,
  Send,
  Box,
  QrCode,
  Scan,
  PackageCheck,
  AlertCircle
} from "lucide-react";

const formatMoney = (amount: number) => `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  shipping_fee: number;
  created_at: string;
  shipping_address: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  tracking_number: string | null;
  courier: string | null;
  notes: string | null;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  variant_name: string | null;
}

export const COURIERS = [
  { value: "jt", label: "J&T Express" },
  { value: "lbc", label: "LBC" },
  { value: "ninja", label: "Ninja Van" },
  { value: "grab", label: "GrabExpress" },
  { value: "lalamove", label: "Lalamove" },
  { value: "gogo", label: "GoGo Xpress" },
  { value: "shopee", label: "Shopee Xpress" },
  { value: "lazada", label: "Lazada Logistics" },
  { value: "flash", label: "Flash Express" },
  { value: "other", label: "Other" }
];

const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "processing", label: "Processing", color: "bg-blue-500" },
  { value: "packed", label: "Packed", color: "bg-purple-500" },
  { value: "shipped", label: "Shipped", color: "bg-indigo-500" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-orange-500" },
  { value: "delivered", label: "Delivered", color: "bg-green-500" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500" }
];

export default function SellerOrderProcessing() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shipmentDialog, setShipmentDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [printLabelDialog, setPrintLabelDialog] = useState(false);
  const [scanTrackingDialog, setScanTrackingDialog] = useState(false);
  const [manualTrackingInput, setManualTrackingInput] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch seller orders with order items
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Fetch orders where seller_id matches or products in order belong to seller
      const { data: orderData, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          status,
          total_amount,
          shipping_fee,
          created_at,
          shipping_address,
          customer_name,
          customer_email,
          customer_phone,
          tracking_number,
          courier,
          notes,
          seller_id
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch order items for each order
      const ordersWithItems = await Promise.all(
        (orderData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("order_items")
            .select(`
              id,
              quantity,
              unit_price,
              variant_name,
              products(name)
            `)
            .eq("order_id", order.id);
          
          return {
            ...order,
            items: (items || []).map((item: any) => ({
              id: item.id,
              product_name: item.products?.name || "Unknown Product",
              quantity: item.quantity,
              unit_price: item.unit_price,
              variant_name: item.variant_name
            }))
          };
        })
      );

      return ordersWithItems as Order[];
    },
    enabled: !!user
  });

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status, notes }: { orderId: string; status: string; notes?: string }) => {
      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status,
          ...(status === "shipped" && { shipped_at: new Date().toISOString() }),
          ...(status === "delivered" && { delivered_at: new Date().toISOString() })
        })
        .eq("id", orderId);
      if (orderError) throw orderError;

      // Add to status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status,
          notes: notes || `Status updated to ${status}`,
          updated_by: user?.id
        });
      if (historyError) console.error("Failed to add status history:", historyError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    }
  });

  // Add shipment info mutation
  const addShipment = useMutation({
    mutationFn: async () => {
      if (!selectedOrder || !trackingNumber || !selectedCourier) {
        throw new Error("Missing shipment details");
      }
      
      const { error } = await supabase
        .from("orders")
        .update({ 
          tracking_number: trackingNumber,
          courier: selectedCourier,
          status: "shipped",
          shipped_at: new Date().toISOString()
        })
        .eq("id", selectedOrder.id);
      if (error) throw error;

      // Add to status history
      await supabase
        .from("order_status_history")
        .insert({
          order_id: selectedOrder.id,
          status: "shipped",
          notes: `Shipped via ${COURIERS.find(c => c.value === selectedCourier)?.label || selectedCourier}. Tracking: ${trackingNumber}`,
          updated_by: user?.id
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      toast.success("Shipment info added and order marked as shipped!");
      setShipmentDialog(false);
      setTrackingNumber("");
      setSelectedCourier("");
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error("Failed to add shipment: " + error.message);
    }
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
    return (
      <Badge className={`${statusInfo.color} text-white`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getCourierLabel = (courierValue: string | null) => {
    if (!courierValue) return "Unknown";
    return COURIERS.find(c => c.value === courierValue)?.label || courierValue;
  };

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === "all" || order.status === activeTab;
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.tracking_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to print the label");
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Label - ${selectedOrder?.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .label { border: 2px dashed #000; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px; }
            .header h1 { font-size: 18px; margin: 0 0 5px 0; }
            .header p { font-size: 14px; margin: 0; font-family: monospace; }
            .section { margin-bottom: 15px; }
            .section-label { font-size: 11px; color: #666; margin-bottom: 3px; }
            .section-content { font-size: 14px; }
            .to-section { background: #f5f5f5; padding: 15px; border-radius: 5px; }
            .to-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .items { font-size: 12px; text-align: center; color: #666; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ccc; }
            .tracking { text-align: center; font-family: monospace; margin-top: 10px; }
            .barcode { text-align: center; font-size: 24px; letter-spacing: 5px; margin-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleScanTracking = () => {
    if (!selectedOrder || !manualTrackingInput) {
      toast.error("Please enter a tracking number");
      return;
    }
    setTrackingNumber(manualTrackingInput);
    setScanTrackingDialog(false);
    setManualTrackingInput("");
    setShipmentDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile?.is_verified_seller) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Seller Verification Required</h3>
          <p className="text-muted-foreground">
            You need to be a verified seller to access order management.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {ORDER_STATUSES.slice(0, 5).map((status) => {
          const count = orders.filter(o => o.status === status.value).length;
          return (
            <Card 
              key={status.value} 
              className={`cursor-pointer hover:border-primary/50 transition-colors ${activeTab === status.value ? 'border-primary ring-2 ring-primary/20' : ''}`}
              onClick={() => setActiveTab(status.value)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-3 h-3 rounded-full ${status.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{status.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by order #, customer, or tracking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            {ORDER_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No orders found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Order Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-semibold text-lg">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                      {order.tracking_number && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          {getCourierLabel(order.courier)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span className="font-medium text-foreground">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                      {order.customer_phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          {order.customer_phone}
                        </div>
                      )}
                      {order.customer_email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {order.customer_email}
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-2">Items:</p>
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>
                              {item.product_name}
                              {item.variant_name && <span className="text-muted-foreground"> ({item.variant_name})</span>}
                              {" × "}{item.quantity}
                            </span>
                            <span className="font-medium">{formatMoney(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tracking Info */}
                    {order.tracking_number && (
                      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                        <Box className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono">{order.tracking_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Amount and Actions */}
                  <div className="flex flex-col items-end gap-3 min-w-[200px]">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {formatMoney(order.total_amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Shipping: {formatMoney(order.shipping_fee || 0)}
                      </p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setPrintLabelDialog(true);
                        }}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Waybill
                      </Button>
                      
                      {!order.tracking_number && order.status !== "cancelled" && order.status !== "delivered" && (
                        <>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setScanTrackingDialog(true);
                            }}
                          >
                            <Scan className="w-4 h-4 mr-1" />
                            Scan
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShipmentDialog(true);
                            }}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Ship
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Status Update */}
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateStatus.mutate({ orderId: order.id, status: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${status.color}`} />
                              {status.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Shipping Address */}
                <Separator className="my-3" />
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span className="whitespace-pre-wrap">{order.shipping_address}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Shipment Dialog */}
      <Dialog open={shipmentDialog} onOpenChange={setShipmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Add Shipment Details
            </DialogTitle>
            <DialogDescription>
              Enter the courier and tracking number after printing your waybill
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Order #{selectedOrder?.order_number}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Courier / Forwarder</Label>
              <Select value={selectedCourier} onValueChange={setSelectedCourier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select courier" />
                </SelectTrigger>
                <SelectContent>
                  {COURIERS.map((courier) => (
                    <SelectItem key={courier.value} value={courier.value}>
                      {courier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input 
                placeholder="Enter or scan tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get this from your courier's waybill after dropping off the package
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipmentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addShipment.mutate()}
              disabled={!trackingNumber || !selectedCourier || addShipment.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Ship Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scan Tracking Dialog */}
      <Dialog open={scanTrackingDialog} onOpenChange={setScanTrackingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" />
              Enter Tracking Number
            </DialogTitle>
            <DialogDescription>
              Scan or manually enter the tracking number from your waybill
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Order #{selectedOrder?.order_number}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input 
                placeholder="Enter tracking number..."
                value={manualTrackingInput}
                onChange={(e) => setManualTrackingInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanTrackingDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleScanTracking}
              disabled={!manualTrackingInput}
            >
              <PackageCheck className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Label Dialog */}
      <Dialog open={printLabelDialog} onOpenChange={setPrintLabelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Shipping Waybill
            </DialogTitle>
            <DialogDescription>
              Print this label and attach it to your package
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div ref={printRef} className="label border-2 border-dashed p-4 space-y-4">
              <div className="header text-center border-b pb-3">
                <h1 className="font-bold text-lg">SHIPPING LABEL</h1>
                <p className="font-mono text-sm">#{selectedOrder.order_number}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(selectedOrder.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <div className="section space-y-1">
                <p className="section-label text-xs text-muted-foreground">FROM:</p>
                <p className="font-medium">{profile?.full_name || "Seller"}</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.email}
                </p>
              </div>

              <div className="to-section bg-muted p-3 rounded-lg space-y-1">
                <p className="text-xs text-muted-foreground">SHIP TO:</p>
                <p className="to-name font-bold text-lg">{selectedOrder.customer_name}</p>
                <p className="text-sm whitespace-pre-wrap">{selectedOrder.shipping_address}</p>
                {selectedOrder.customer_phone && (
                  <p className="text-sm flex items-center gap-1 mt-2">
                    <Phone className="w-3 h-3" />
                    {selectedOrder.customer_phone}
                  </p>
                )}
              </div>

              <div className="items text-center pt-3 border-t border-dashed">
                <p className="text-xs text-muted-foreground">
                  Items: {selectedOrder.items.length} | 
                  Total: {formatMoney(selectedOrder.total_amount)}
                </p>
                {selectedOrder.tracking_number && (
                  <div className="tracking mt-2">
                    <p className="text-xs text-muted-foreground">{getCourierLabel(selectedOrder.courier)}</p>
                    <p className="barcode font-mono text-lg tracking-widest mt-1">
                      {selectedOrder.tracking_number}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintLabelDialog(false)}>
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print Waybill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}