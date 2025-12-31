import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Heart, MapPin, Navigation } from "lucide-react";
import { LiveDriverMap } from "./LiveDriverMap";
import { DriverTipDialog } from "./DriverTipDialog";
import { OrderTimeline } from "./OrderTimeline";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-cyan-500",
  assigned: "bg-purple-500",
  picked_up: "bg-indigo-500",
  in_transit: "bg-violet-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

interface FoodOrder {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  total_diamond_credits: number;
  delivery_address: string;
  delivery_notes: string | null;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  rider_id: string | null;
  created_at: string;
  vendor: { name: string; logo_url: string | null; latitude: number | null; longitude: number | null } | null;
  rider: { id: string; user_id: string } | null;
  items: Array<{
    id: string;
    quantity: number;
    subtotal: number;
    item_name: string | null;
    food_item: { name: string; image_url: string | null } | null;
  }>;
}

export const MyFoodOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tipDialogOrder, setTipDialogOrder] = useState<FoodOrder | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-food-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_orders")
        .select(`
          *,
          vendor:food_vendors(name, logo_url, latitude, longitude),
          rider:delivery_riders!food_orders_rider_id_fkey(id, user_id),
          items:food_order_items(
            *,
            food_item:food_items(name, image_url)
          )
        `)
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FoodOrder[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime order updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("my-food-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_orders",
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-food-orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No orders yet</p>
      </div>
    );
  }

  const activeStatuses = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up", "in_transit"];
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));
  const pastOrders = orders.filter((o) => !activeStatuses.includes(o.status));

  return (
    <div className="space-y-6">
      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Active Orders</h3>
          {activeOrders.map((order) => (
            <Card key={order.id} className="border-primary/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {order.vendor?.logo_url && (
                      <img
                        src={order.vendor.logo_url}
                        alt={order.vendor.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <CardTitle className="text-base">{order.vendor?.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColors[order.status]}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Timeline */}
                <OrderTimeline status={order.status} />

                {/* Live Driver Map - Show when driver is assigned */}
                {order.rider && ["assigned", "picked_up", "in_transit"].includes(order.status) && (
                  <LiveDriverMap
                    orderId={order.id}
                    driverId={order.rider.id}
                    customerLat={order.delivery_latitude || undefined}
                    customerLng={order.delivery_longitude || undefined}
                    vendorLat={order.vendor?.latitude || undefined}
                    vendorLng={order.vendor?.longitude || undefined}
                    orderStatus={order.status}
                  />
                )}

                <div className="text-sm text-muted-foreground">
                  Order #{order.order_number}
                </div>

                <div className="space-y-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{item.quantity}x</span>
                      <span>{item.item_name || item.food_item?.name}</span>
                      <span className="ml-auto">₱{item.subtotal}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₱{order.total_amount}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-start gap-1">
                  <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{order.delivery_address}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Past Orders</h3>
          {pastOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {order.vendor?.logo_url && (
                      <img
                        src={order.vendor.logo_url}
                        alt={order.vendor.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <CardTitle className="text-base">{order.vendor?.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColors[order.status]}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Order #{order.order_number}
                </div>

                <div className="space-y-2">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{item.quantity}x</span>
                      <span>{item.item_name || item.food_item?.name}</span>
                      <span className="ml-auto">₱{item.subtotal}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₱{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Fee</span>
                    <span>₱{order.delivery_fee}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>₱{order.total_amount}</span>
                  </div>
                  {order.total_diamond_credits > 0 && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Diamond Rewards</span>
                      <span>+{order.total_diamond_credits} 💎</span>
                    </div>
                  )}
                </div>

                {/* Tip button for delivered orders */}
                {order.status === "delivered" && order.rider && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setTipDialogOrder(order)}
                  >
                    <Heart className="w-4 h-4 mr-2 text-red-500" />
                    Tip Your Driver
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tip Dialog */}
      {tipDialogOrder && tipDialogOrder.rider && (
        <DriverTipDialog
          open={!!tipDialogOrder}
          onOpenChange={(open) => !open && setTipDialogOrder(null)}
          orderId={tipDialogOrder.id}
          driverId={tipDialogOrder.rider.id}
        />
      )}
    </div>
  );
};
