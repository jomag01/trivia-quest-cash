import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Package, Truck, CheckCircle, XCircle, Clock, Pencil } from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  shop_items: {
    name: string;
    image_url: string | null;
  };
  product_variations: {
    size: string | null;
    weight: string | null;
    color: string | null;
  } | null;
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  user_id: string;
  order_items: OrderItem[];
}

interface OrderWithProfile extends Order {
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export const OrderManager = () => {
  const [orders, setOrders] = useState<OrderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<OrderWithProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<{
    status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
    tracking_number: string;
    notes: string;
  }>({
    status: 'pending',
    tracking_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            quantity,
            price_at_purchase,
            shop_items (
              name,
              image_url
            ),
            product_variations (
              size,
              weight,
              color
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const ordersWithProfiles: OrderWithProfile[] = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", order.user_id)
            .single();

          return {
            ...order,
            profiles: profile || null
          };
        })
      );

      setOrders(ordersWithProfiles);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (order: OrderWithProfile) => {
    setEditingOrder(order);
    setFormData({
      status: order.status,
      tracking_number: order.tracking_number || '',
      notes: order.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrder) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: formData.status,
          tracking_number: formData.tracking_number || null,
          notes: formData.notes || null,
        })
        .eq("id", editingOrder.id);

      if (error) throw error;

      toast.success("Order updated successfully");
      setIsDialogOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    }
  };

  const getStatusIcon = (status: OrderWithProfile['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'in_transit':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: OrderWithProfile['status']) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-500/20 text-yellow-600";
      case 'processing':
        return "bg-blue-500/20 text-blue-600";
      case 'in_transit':
        return "bg-purple-500/20 text-purple-600";
      case 'delivered':
        return "bg-green-500/20 text-green-600";
      case 'cancelled':
        return "bg-red-500/20 text-red-600";
      default:
        return "bg-gray-500/20 text-gray-600";
    }
  };

  const getStatusLabel = (status: OrderWithProfile['status']) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No orders yet</p>
        </Card>
      ) : (
        orders.map((order) => (
          <Card key={order.id} className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{order.order_number}</h3>
                  <Badge className={getStatusColor(order.status)}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </span>
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>Customer:</strong> {order.profiles?.full_name || 'N/A'}</p>
                  <p><strong>Email:</strong> {order.profiles?.email || 'N/A'}</p>
                  <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                  {order.tracking_number && (
                    <p><strong>Tracking:</strong> <span className="font-mono">{order.tracking_number}</span></p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${order.total_amount.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEditDialog(order)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {order.notes && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm"><strong>Note:</strong> {order.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">Order Items</h4>
              {order.order_items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                  {item.shop_items.image_url && (
                    <img
                      src={item.shop_items.image_url}
                      alt={item.shop_items.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{item.shop_items.name}</p>
                    {item.product_variations && (
                      <p className="text-xs text-muted-foreground">
                        {[
                          item.product_variations.size && `Size: ${item.product_variations.size}`,
                          item.product_variations.weight && `Weight: ${item.product_variations.weight}`,
                          item.product_variations.color && `Color: ${item.product_variations.color}`
                        ].filter(Boolean).join(' • ')}
                      </p>
                    )}
                    <p className="text-xs mt-1">Qty: {item.quantity} × ${item.price_at_purchase.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ${(item.quantity * item.price_at_purchase).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled' })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tracking_number">Tracking Number</Label>
              <Input
                id="tracking_number"
                value={formData.tracking_number}
                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                placeholder="Enter tracking number"
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add notes about the order"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                Update Order
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
