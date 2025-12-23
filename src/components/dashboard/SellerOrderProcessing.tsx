import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formatMoney = (amount: number) => `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

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
  ExternalLink,
  Send,
  Box,
  RotateCcw
} from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  tracking_number: string | null;
  courier: string | null;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  variant: string | null;
}

const COURIERS = [
  { value: "jt", label: "J&T Express" },
  { value: "lbc", label: "LBC" },
  { value: "ninja", label: "Ninja Van" },
  { value: "grab", label: "GrabExpress" },
  { value: "lalamove", label: "Lalamove" },
  { value: "gogo", label: "GoGo Xpress" },
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shipmentDialog, setShipmentDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [printLabelDialog, setPrintLabelDialog] = useState(false);

  // Fetch seller orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["seller-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const result = await (supabase as any)
        .from("orders")
        .select("id, order_number, status, total_amount, created_at, shipping_address, tracking_number, courier")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      
      if (result.error) throw result.error;

      return (result.data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        shipping_address: order.shipping_address || "Address not provided",
        buyer_name: "Customer",
        buyer_email: "",
        buyer_phone: "",
        tracking_number: order.tracking_number,
        courier: order.courier,
        items: []
      }));
    },
    enabled: !!user
  });

  // Update order status
  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      toast.success("Order status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    }
  });

  // Add shipment info
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
          status: "shipped"
        })
        .eq("id", selectedOrder.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      toast.success("Shipment info added and order marked as shipped!");
      setShipmentDialog(false);
      setTrackingNumber("");
      setSelectedCourier("");
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

  const filteredOrders = orders.filter(order => {
    const matchesTab = activeTab === "all" || order.status === activeTab;
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const printShippingLabel = (order: Order) => {
    setSelectedOrder(order);
    setPrintLabelDialog(true);
  };

  const handlePrint = () => {
    window.print();
    setPrintLabelDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
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
              className={`cursor-pointer hover:border-primary/50 transition-colors ${activeTab === status.value ? 'border-primary' : ''}`}
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
            placeholder="Search orders..."
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">#{order.order_number}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.buyer_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Items: </span>
                      {order.items.map((item, idx) => (
                        <span key={item.id}>
                          {item.product_name} x{item.quantity}
                          {idx < order.items.length - 1 && ", "}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Amount and Actions */}
                  <div className="flex flex-col md:items-end gap-2">
                    <p className="text-xl font-bold text-primary">
                      {formatMoney(order.total_amount)}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => printShippingLabel(order)}
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Label
                      </Button>
                      {!order.tracking_number && order.status !== "cancelled" && order.status !== "delivered" && (
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
                      )}
                      {order.tracking_number && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Box className="w-3 h-3" />
                          {order.courier}: {order.tracking_number}
                        </Badge>
                      )}
                      <Select
                        value={order.status}
                        onValueChange={(value) => updateStatus.mutate({ orderId: order.id, status: value })}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{order.shipping_address}</span>
                  </div>
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
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">Order #{selectedOrder?.order_number}</p>
              <p className="text-sm text-muted-foreground">{selectedOrder?.buyer_name}</p>
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
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShipmentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => addShipment.mutate()}
              disabled={!trackingNumber || !selectedCourier}
            >
              <Send className="w-4 h-4 mr-2" />
              Ship Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Label Dialog */}
      <Dialog open={printLabelDialog} onOpenChange={setPrintLabelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shipping Label</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="border-2 border-dashed p-4 space-y-4 print:border-solid">
              <div className="text-center border-b pb-3">
                <p className="font-bold text-lg">SHIPPING LABEL</p>
                <p className="font-mono">#{selectedOrder.order_number}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">FROM:</p>
                <p className="font-medium">Your Store Name</p>
                <p className="text-sm">Your Store Address</p>
              </div>

              <div className="space-y-1 bg-muted p-3 rounded">
                <p className="text-xs text-muted-foreground">TO:</p>
                <p className="font-bold text-lg">{selectedOrder.buyer_name}</p>
                <p className="text-sm">{selectedOrder.shipping_address}</p>
                {selectedOrder.buyer_phone && (
                  <p className="text-sm flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {selectedOrder.buyer_phone}
                  </p>
                )}
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">Items: {selectedOrder.items.length}</p>
                {selectedOrder.tracking_number && (
                  <p className="font-mono text-sm mt-1">
                    {selectedOrder.courier}: {selectedOrder.tracking_number}
                  </p>
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
              Print Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
