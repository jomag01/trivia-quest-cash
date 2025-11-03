import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  shipping_address: string;
  notes: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  commission_percentage: number;
  products: {
    name: string;
  };
  product_variants: {
    variant_type: string;
    variant_value: string;
  } | null;
}

export const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load orders");
      console.error(error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        *,
        products (name),
        product_variants (variant_type, variant_value)
      `)
      .eq("order_id", orderId);

    if (error) {
      toast.error("Failed to load order items");
      console.error(error);
    } else {
      setOrderItems(data || []);
    }
  };

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    await fetchOrderItems(order.id);
    setIsDetailsOpen(true);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order status");
      console.error(error);
    } else {
      toast.success("Order status updated");
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "processing": return "default";
      case "completed": return "success";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Order Management</h2>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-sm">
                  {order.id.substring(0, 8)}...
                </TableCell>
                <TableCell>
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>₱{order.total_amount.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusColor(order.status) as any}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewDetails(order)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusUpdate(order.id, value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order ID: {selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={getStatusColor(selectedOrder.status) as any}>
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Date</p>
                  <p>{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium">Shipping Address</p>
                  <p className="whitespace-pre-wrap">{selectedOrder.shipping_address}</p>
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium">Notes</p>
                    <p className="whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products.name}</TableCell>
                        <TableCell>
                          {item.product_variants 
                            ? `${item.product_variants.variant_type}: ${item.product_variants.variant_value}`
                            : "-"
                          }
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₱{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>₱{item.total_price.toFixed(2)}</TableCell>
                        <TableCell>{item.commission_percentage}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>₱{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
