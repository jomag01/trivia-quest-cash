import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  out_for_delivery: "bg-purple-500",
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
  created_at: string;
  vendor: { name: string; logo_url: string | null } | null;
  items: Array<{
    id: string;
    quantity: number;
    subtotal: number;
    food_item: { name: string; image_url: string | null } | null;
  }>;
}

export const MyFoodOrders = () => {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-food-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_orders")
        .select(`
          *,
          vendor:food_vendors(name, logo_url),
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

  return (
    <div className="space-y-4">
      {orders.map((order) => (
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
                  <span>{item.food_item?.name}</span>
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

            <div className="text-xs text-muted-foreground">
              <p><strong>Delivery:</strong> {order.delivery_address}</p>
              {order.delivery_notes && <p><strong>Notes:</strong> {order.delivery_notes}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
