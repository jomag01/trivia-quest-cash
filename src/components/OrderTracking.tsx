import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";

export const OrderTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(name))")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch status history for each order
      const ordersWithHistory = await Promise.all(
        (data || []).map(async (order) => {
          const { data: history } = await supabase
            .from("order_status_history")
            .select("*")
            .eq("order_id", order.id)
            .order("created_at", { ascending: true });
          
          return { ...order, status_history: history || [] };
        })
      );
      
      setOrders(ordersWithHistory);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped":
        return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-blue-500";
      case "shipped":
        return "bg-purple-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Package className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No orders yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <Card key={order.id} className="p-6 gradient-accent border-primary/20">
          <div className="space-y-4">
            {/* Order Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-lg">Order #{order.order_number}</h3>
                  <Badge className={getStatusColor(order.status)}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Placed on {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-2xl font-bold text-primary">
                  ₱{order.total_amount.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Shipping: ₱{order.shipping_fee.toFixed(2)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h4 className="font-semibold mb-3">Items</h4>
              <div className="space-y-2">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.products?.name} × {item.quantity}
                    </span>
                    <span className="font-semibold">₱{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tracking Information */}
            {order.tracking_number && (
              <div className="p-3 bg-background/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Tracking Number</span>
                </div>
                <p className="font-mono text-sm">{order.tracking_number}</p>
              </div>
            )}

            {/* Status Timeline */}
            {order.status_history && order.status_history.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Order Timeline</h4>
                <div className="space-y-3">
                  {order.status_history.map((history: any, index: number) => (
                    <div key={history.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {getStatusIcon(history.status)}
                        {index < order.status_history.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-semibold capitalize">{history.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(history.created_at).toLocaleString()}
                        </p>
                        {history.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {history.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Address */}
            <div className="p-3 bg-background/20 rounded-lg">
              <h4 className="font-semibold text-sm mb-1">Shipping Address</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.shipping_address}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
