import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, Truck, CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react";

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
  order_items: OrderItem[];
}

const MyOrders = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      toast.error("Please login to view your orders");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
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
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'processing':
        return <Package className="w-5 h-5" />;
      case 'in_transit':
        return <Truck className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: Order['status']) => {
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

  const getStatusLabel = (status: Order['status']) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gradient-gold">My Orders</h1>
          <p className="text-muted-foreground">Track your order status and delivery</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">
            Start shopping to see your orders here
          </p>
          <Button onClick={() => navigate("/shop")}>
            Browse Shop
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{order.order_number}</h3>
                    <Badge className={getStatusColor(order.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ordered on {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${order.total_amount.toFixed(2)}
                  </p>
                  {order.tracking_number && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Tracking Number</p>
                      <p className="font-mono text-sm font-semibold">{order.tracking_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {order.notes && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm"><strong>Note:</strong> {order.notes}</p>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground">Order Items</h4>
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                    {item.shop_items.image_url && (
                      <img
                        src={item.shop_items.image_url}
                        alt={item.shop_items.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h5 className="font-semibold">{item.shop_items.name}</h5>
                      {item.product_variations && (
                        <p className="text-sm text-muted-foreground">
                          {[
                            item.product_variations.size && `Size: ${item.product_variations.size}`,
                            item.product_variations.weight && `Weight: ${item.product_variations.weight}`,
                            item.product_variations.color && `Color: ${item.product_variations.color}`
                          ].filter(Boolean).join(' • ')}
                        </p>
                      )}
                      <p className="text-sm mt-1">
                        Quantity: {item.quantity} × ${item.price_at_purchase.toFixed(2)}
                      </p>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
