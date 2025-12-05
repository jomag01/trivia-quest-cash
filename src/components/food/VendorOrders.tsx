import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { Phone, MapPin } from "lucide-react";

interface VendorOrdersProps {
  vendorId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  preparing: "bg-orange-500",
  out_for_delivery: "bg-purple-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

interface FoodOrder {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  delivery_notes: string | null;
  customer_phone: string;
  created_at: string;
  customer: { full_name: string | null; email: string | null } | null;
  items: Array<{
    id: string;
    quantity: number;
    subtotal: number;
    food_item: { name: string } | null;
  }>;
}

export const VendorOrders = ({ vendorId }: VendorOrdersProps) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["vendor-orders", vendorId, statusFilter],
    queryFn: async () => {
      let query = (supabase as any)
        .from("food_orders")
        .select(`
          *,
          customer:profiles!food_orders_customer_id_fkey(full_name, email),
          items:food_order_items(
            *,
            food_item:food_items(name)
          )
        `)
        .eq("vendor_id", vendorId);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as FoodOrder[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const updateData: any = { status };
      if (status === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      const { error } = await (supabase as any)
        .from("food_orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Order status updated");
    },
  });

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
          <SelectTrigger className="w-28 h-8 text-xs">
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
                  <Badge className={`${statusColors[order.status]} text-[10px] px-1.5 py-0.5`}>
                    {order.status.replace(/_/g, " ")}
                  </Badge>
                </div>

                <div className="text-xs">
                  <p className="font-medium">{order.customer?.full_name || "Customer"}</p>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="w-2.5 h-2.5" />
                    <span className="text-[10px]">{order.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-1 text-muted-foreground mt-0.5">
                    <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                    <span className="text-[10px] line-clamp-2">{order.delivery_address}</span>
                  </div>
                  {order.delivery_notes && (
                    <p className="text-[10px] italic mt-0.5 text-muted-foreground">Note: {order.delivery_notes}</p>
                  )}
                </div>

                <div className="border-t pt-2">
                  <p className="text-[10px] font-medium mb-1">Items:</p>
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-[10px]">
                      <span className="truncate max-w-[60%]">{item.quantity}x {item.food_item?.name}</span>
                      <span>₱{item.subtotal}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-xs mt-1.5 pt-1.5 border-t">
                    <span>Total</span>
                    <span>₱{order.total_amount}</span>
                  </div>
                </div>

                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <div className="pt-1">
                    <Select
                      value={order.status}
                      onValueChange={(value) =>
                        updateStatusMutation.mutate({ orderId: order.id, status: value })
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
