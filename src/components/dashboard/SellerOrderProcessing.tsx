import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { processSellerReferrerCommission } from "@/lib/sellerReferralCommission";
import jsPDF from "jspdf";

import { 
  Package, 
  Truck, 
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
  Scan,
  PackageCheck,
  AlertCircle,
  RefreshCw,
  Undo2,
  FileDown,
  CheckCircle2
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
  customer_notes: string | null;
  referrer_code: string | null;
  commission_status: string | null;
  return_reason: string | null;
  items: OrderItem[];
  courier_status?: string | null;
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
  { value: "triviabees", label: "Triviabees Courier" },
  { value: "other", label: "Other" }
];

const ORDER_STATUSES = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "processing", label: "Processing", color: "bg-blue-500" },
  { value: "packed", label: "Packed", color: "bg-purple-500" },
  { value: "shipped", label: "Shipped", color: "bg-indigo-500" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "bg-orange-500" },
  { value: "delivered", label: "Delivered", color: "bg-green-500" },
  { value: "return_faulty", label: "Return (Faulty)", color: "bg-red-400" },
  { value: "reshipped", label: "Reshipped", color: "bg-cyan-500" },
  { value: "redelivered", label: "Redelivered", color: "bg-emerald-500" },
  { value: "refunded", label: "Refunded", color: "bg-rose-600" },
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
  const [refundDialog, setRefundDialog] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch seller orders with order items and courier sync
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["seller-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: orderData, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, total_amount, shipping_fee, created_at,
          shipping_address, customer_name, customer_email, customer_phone,
          tracking_number, courier, notes, customer_notes, referrer_code,
          seller_id, commission_status, return_reason
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;

      // Fetch order items and courier status for each order
      const ordersWithItems = await Promise.all(
        (orderData || []).map(async (order) => {
          const { data: items } = await supabase
            .from("order_items")
            .select(`id, quantity, unit_price, variant_name, products(name)`)
            .eq("order_id", order.id);
          
          // Check courier_shipments for live status sync
          let courierStatus = null;
          if (order.tracking_number) {
            const { data: shipment } = await supabase
              .from("courier_shipments")
              .select("status")
              .eq("order_id", order.id)
              .maybeSingle();
            courierStatus = shipment?.status;
          }
          
          return {
            ...order,
            courier_status: courierStatus,
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
    enabled: !!user,
    refetchInterval: 30000 // Auto-refresh every 30s for courier sync
  });

  // Update order status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status, notes, totalAmount }: { orderId: string; status: string; notes?: string; totalAmount?: number }) => {
      const updateData: any = { 
        status,
        ...(status === "shipped" && { shipped_at: new Date().toISOString() }),
        ...(status === "delivered" && { delivered_at: new Date().toISOString() }),
      };

      if (status === "return_faulty") {
        const holdUntil = new Date();
        holdUntil.setDate(holdUntil.getDate() + 15);
        updateData.commission_status = 'on_hold';
        updateData.commission_hold_until = holdUntil.toISOString();
        updateData.return_requested_at = new Date().toISOString();
      }

      if (status === "redelivered") {
        updateData.commission_status = 'released';
        updateData.commission_hold_until = null;
      }

      if (status === "refunded") {
        updateData.commission_status = 'cancelled';
        updateData.return_reason = notes || 'Refunded by seller';
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);
      if (orderError) throw orderError;

      await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          status,
          notes: notes || `Status updated to ${status}`,
          updated_by: user?.id
        });

      if ((status === "delivered" || status === "redelivered") && user?.id && totalAmount) {
        await processSellerReferrerCommission(user.id, orderId, totalAmount, 'products');
      }
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
      toast.success("Shipment info added!");
      setShipmentDialog(false);
      setTrackingNumber("");
      setSelectedCourier("");
      setSelectedOrder(null);
    },
    onError: (error) => {
      toast.error("Failed to add shipment: " + error.message);
    }
  });

  // Refund mutation
  const processRefund = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) throw new Error("No order selected");
      
      await updateStatus.mutateAsync({
        orderId: selectedOrder.id,
        status: "refunded",
        notes: refundReason || "Refunded by seller",
        totalAmount: selectedOrder.total_amount
      });
    },
    onSuccess: () => {
      toast.success("Order refunded successfully");
      setRefundDialog(false);
      setRefundReason("");
      setSelectedOrder(null);
    }
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
    return <Badge className={`${statusInfo.color} text-white`}>{statusInfo.label}</Badge>;
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

  // Generate PDF Waybill
  const generatePDFWaybill = (order: Order) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("SHIPPING WAYBILL", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Order #${order.order_number}`, 105, 30, { align: "center" });
    doc.text(new Date(order.created_at).toLocaleDateString(), 105, 37, { align: "center" });
    
    // Divider
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    // From Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FROM:", 20, 55);
    doc.setFont("helvetica", "normal");
    doc.text(profile?.full_name || "Seller", 20, 62);
    doc.text(profile?.email || "", 20, 69);
    
    // To Section (boxed)
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 80, 170, 50, "F");
    doc.setFont("helvetica", "bold");
    doc.text("SHIP TO:", 25, 90);
    doc.setFontSize(14);
    doc.text(order.customer_name || "Customer", 25, 100);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const addressLines = doc.splitTextToSize(order.shipping_address || "", 160);
    doc.text(addressLines, 25, 110);
    
    if (order.customer_phone) {
      doc.text(`Phone: ${order.customer_phone}`, 25, 125);
    }
    
    // Items Section
    doc.setFont("helvetica", "bold");
    doc.text("ITEMS:", 20, 145);
    doc.setFont("helvetica", "normal");
    
    let yPos = 152;
    order.items.forEach((item, index) => {
      const itemText = `${index + 1}. ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ""} x${item.quantity} - ${formatMoney(item.unit_price * item.quantity)}`;
      doc.text(itemText, 25, yPos);
      yPos += 7;
    });
    
    // Total
    doc.line(20, yPos + 5, 190, yPos + 5);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: ${formatMoney(order.total_amount)}`, 20, yPos + 15);
    doc.text(`Shipping: ${formatMoney(order.shipping_fee || 0)}`, 120, yPos + 15);
    
    // Tracking section
    if (order.tracking_number) {
      doc.setFontSize(12);
      doc.text(`Courier: ${getCourierLabel(order.courier)}`, 20, yPos + 30);
      doc.setFontSize(16);
      doc.text(`Tracking: ${order.tracking_number}`, 20, yPos + 40);
    }
    
    // Barcode placeholder
    doc.setFontSize(24);
    doc.setFont("courier", "bold");
    doc.text(order.order_number, 105, 270, { align: "center" });
    
    doc.save(`waybill-${order.order_number}.pdf`);
    toast.success("PDF Waybill downloaded!");
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
          <p className="text-muted-foreground">You need to be a verified seller to access order management.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {ORDER_STATUSES.slice(0, 6).map((status) => {
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
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
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
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync
        </Button>
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
                      {order.courier_status && (
                        <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-300">
                          <Truck className="w-3 h-3" />
                          Courier: {order.courier_status}
                        </Badge>
                      )}
                      {order.commission_status === 'on_hold' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                          ⏳ Commission Held
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

                    {order.customer_notes && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">📝 Customer Notes:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">{order.customer_notes}</p>
                      </div>
                    )}

                    {order.tracking_number && (
                      <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                        <Box className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono">{order.tracking_number}</span>
                        <span className="text-xs text-muted-foreground">({getCourierLabel(order.courier)})</span>
                      </div>
                    )}
                  </div>

                  {/* Amount and Actions */}
                  <div className="flex flex-col items-end gap-3 min-w-[220px]">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{formatMoney(order.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">Shipping: {formatMoney(order.shipping_fee || 0)}</p>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generatePDFWaybill(order)}
                      >
                        <FileDown className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                      
                      {!order.tracking_number && order.status !== "cancelled" && order.status !== "delivered" && order.status !== "refunded" && (
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
                      
                      {(order.status === "return_faulty" || order.status === "delivered") && (
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setRefundDialog(true);
                          }}
                        >
                          <Undo2 className="w-4 h-4 mr-1" />
                          Refund
                        </Button>
                      )}
                    </div>

                    {/* Status Update */}
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateStatus.mutate({ 
                        orderId: order.id, 
                        status: value,
                        totalAmount: order.total_amount 
                      })}
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
            <DialogDescription>Enter the courier and tracking number after printing your waybill</DialogDescription>
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
                    <SelectItem key={courier.value} value={courier.value}>{courier.label}</SelectItem>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipmentDialog(false)}>Cancel</Button>
            <Button onClick={() => addShipment.mutate()} disabled={!trackingNumber || !selectedCourier || addShipment.isPending}>
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
            <DialogDescription>Scan or manually enter the tracking number from your waybill</DialogDescription>
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
            <Button variant="outline" onClick={() => setScanTrackingDialog(false)}>Cancel</Button>
            <Button onClick={handleScanTracking} disabled={!manualTrackingInput}>
              <PackageCheck className="w-4 h-4 mr-2" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialog} onOpenChange={setRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="w-5 h-5" />
              Process Refund
            </DialogTitle>
            <DialogDescription>This will refund the order and cancel any pending commissions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Order #{selectedOrder?.order_number}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder?.customer_name}</p>
              <p className="text-lg font-bold text-destructive mt-2">{formatMoney(selectedOrder?.total_amount || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label>Refund Reason</Label>
              <Textarea 
                placeholder="Enter reason for refund..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => processRefund.mutate()} disabled={processRefund.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
