import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { Phone, MapPin, Bike } from "lucide-react";

interface VendorOrdersProps {
  vendorId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  ready: "bg-cyan-500",
  assigned: "bg-purple-500",
  in_transit: "bg-indigo-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready for Pickup" },
  { value: "assigned", label: "Rider Assigned" },
  { value: "in_transit", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

interface FoodOrderItem {
  id: string;
  quantity: number;
  subtotal: number;
  item_id: string;
}

interface FoodOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  subtotal: number;
  delivery_fee: number;
  delivery_address: string;
  notes: string | null;
  customer_phone: string;
  customer_name: string | null;
  customer_id: string;
  rider_id: string | null;
  created_at: string;
  items: FoodOrderItem[];
  itemNames: Record<string, string>;
}

export const VendorOrders = ({ vendorId }: VendorOrdersProps) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendor-orders", vendorId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("food_orders")
        .select("*")
        .eq("vendor_id", vendorId);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch order items and food item names separately
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order: any) => {
          // Get order items
          const { data: items } = await (supabase as any)
            .from("food_order_items")
            .select("id, quantity, subtotal, item_id")
            .eq("order_id", order.id);

          // Get food item names for each item
          const itemNames: Record<string, string> = {};
          if (items?.length) {
            const itemIds = items.map((i: any) => i.item_id);
            const { data: foodItems } = await (supabase as any)
              .from("food_items")
              .select("id, name")
              .in("id", itemIds);
            
            foodItems?.forEach((fi: any) => {
              itemNames[fi.id] = fi.name;
            });
          }

          return { ...order, items: items || [], itemNames };
        })
      );

      return ordersWithItems as FoodOrder[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, order }: { orderId: string; status: string; order: FoodOrder }) => {
      const updateData: any = { status };
      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("food_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // If marking as "ready", notify available riders
      if (status === "ready") {
        // Get all approved and available riders
        const { data: riders } = await (supabase as any)
          .from("delivery_riders")
          .select("user_id")
          .eq("status", "approved")
          .eq("is_available", true);

        if (riders?.length) {
          // Create notifications for all available riders
          const notifications = riders.map((rider: any) => ({
            user_id: rider.user_id,
            type: "food_order_ready",
            title: "New Delivery Available",
            message: `Order #${order.order_number} is ready for pickup. Total: ₱${order.total_amount}`,
          }));

          await (supabase as any).from("notifications").insert(notifications);
        }
      }

      // Notify customer about status update
      if (order.customer_id) {
        await (supabase as any).from("notifications").insert({
          user_id: order.customer_id,
          type: "food_order_status",
          title: "Order Status Update",
          message: `Your order #${order.order_number} is now ${status.replace(/_/g, " ")}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Order status updated");
    },
  });

  const markReadyForRiders = (order: FoodOrder) => {
    updateStatusMutation.mutate({ orderId: order.id, status: "ready", order });
    toast.info("Riders have been notified about this order!");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-semibold">Orders</h4>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Orders</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!orders?.length ? (
        <div className="text-center py-6">
          <p className="text-xs text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Order #{order.order_number}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(order.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <Badge className={`${statusColors[order.status] || "bg-gray-500"} text-[10px] px-1.5 py-0.5`}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="text-xs">
                  <p className="font-medium">{order.customer_name || "Customer"}</p>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-2.5 h-2.5" />
                    <span className="text-[10px]">{order.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-1 text-muted-foreground mt-0.5">
                    <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                    <span className="text-[10px] line-clamp-2">{order.delivery_address}</span>
                  </div>
                  {order.notes && (
                    <p className="text-[10px] italic mt-0.5 text-muted-foreground">Note: {order.notes}</p>
                  )}
                </div>

                <div className="border-t pt-2">
                  <p className="text-[10px] font-medium mb-1">Items:</p>
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[60%]">
                        {item.quantity}x {order.itemNames[item.item_id] || "Item"}
                      </span>
                      <span>₱{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₱{order.subtotal?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Delivery Fee</span>
                    <span>₱{order.delivery_fee?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs mt-1.5 pt-1.5 border-t">
                    <span>Total</span>
                    <span>₱{order.total_amount?.toFixed(2)}</span>
                  </div>
                </div>

                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <div className="pt-1 space-y-2">
                    {/* Quick action button to send to riders */}
                    {(order.status === "preparing" || order.status === "confirmed") && !order.rider_id && (
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs gap-1"
                        onClick={() => markReadyForRiders(order)}
                        disabled={updateStatusMutation.isPending}
                      >
                        <Bike className="w-3 h-3" />
                        Ready - Send to Riders
                      </Button>
                    )}
                    
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({ orderId: order.id, status: value, order })
                      }
                    >
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {order.rider_id && (
                  <div className="pt-1 flex items-center gap-1 text-xs text-primary">
                    <Bike className="w-3 h-3" />
                    <span>Rider assigned</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};