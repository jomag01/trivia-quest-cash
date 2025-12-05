import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Phone, Package, Clock, CheckCircle, Navigation, Wallet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DeliveryAssignment {
  id: string;
  order_id: string;
  status: string;
  rider_credits_deducted: number;
  delivery_fee: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude: number | null;
  customer_longitude: number | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  distance_km: number | null;
  estimated_time_minutes: number | null;
  created_at: string;
  food_orders?: {
    order_number: string;
    total_amount: number;
    notes: string | null;
  };
  food_vendors?: {
    name: string;
    phone: string | null;
  };
}

export const RiderDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("available");

  const { data: riderProfile } = useQuery({
    queryKey: ["rider-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_riders")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: userCredits } = useQuery({
    queryKey: ["user-credits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data?.credits || 0;
    },
    enabled: !!user?.id,
  });

  const { data: myAssignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["my-deliveries", riderProfile?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_assignments")
        .select(`
          *,
          food_orders(order_number, total_amount, notes),
          food_vendors(name, phone)
        `)
        .eq("rider_id", riderProfile?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DeliveryAssignment[];
    },
    enabled: !!riderProfile?.id,
  });

  const { data: availableOrders } = useQuery({
    queryKey: ["available-orders"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_orders")
        .select(`
          *,
          food_vendors(name, address, latitude, longitude, phone)
        `)
        .eq("status", "ready")
        .is("rider_id", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!riderProfile?.id && riderProfile?.status === "approved",
    refetchInterval: 10000,
  });

  const toggleAvailableMutation = useMutation({
    mutationFn: async (is_available: boolean) => {
      const { error } = await (supabase as any)
        .from("delivery_riders")
        .update({ is_available })
        .eq("id", riderProfile?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-profile"] });
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (order: any) => {
      // Check if rider has enough credits
      if ((userCredits || 0) < order.total_amount) {
        throw new Error("Insufficient credits. Please top up to accept this order.");
      }

      // Deduct credits from rider
      const { error: creditError } = await supabase
        .from("profiles")
        .update({ credits: (userCredits || 0) - order.total_amount })
        .eq("id", user?.id);
      if (creditError) throw creditError;

      // Create delivery assignment
      const { error: assignError } = await (supabase as any)
        .from("delivery_assignments")
        .insert({
          order_id: order.id,
          rider_id: riderProfile?.id,
          vendor_id: order.vendor_id,
          status: "assigned",
          rider_credits_deducted: order.total_amount,
          delivery_fee: order.delivery_fee,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_address: order.delivery_address,
          customer_latitude: order.delivery_latitude,
          customer_longitude: order.delivery_longitude,
          pickup_address: order.food_vendors?.address,
          pickup_latitude: order.food_vendors?.latitude,
          pickup_longitude: order.food_vendors?.longitude,
        });
      if (assignError) throw assignError;

      // Update order with rider
      const { error: orderError } = await (supabase as any)
        .from("food_orders")
        .update({ rider_id: riderProfile?.id, status: "assigned" })
        .eq("id", order.id);
      if (orderError) throw orderError;

      // Notify vendor
      await (supabase as any).from("notifications").insert({
        user_id: order.food_vendors?.owner_id,
        type: "delivery_accepted",
        title: "Rider Accepted Order",
        message: `A rider has accepted order #${order.order_number} for delivery.`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-orders"] });
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["user-credits"] });
      toast.success("Order accepted! Credits deducted.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to accept order");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const updates: any = { status };
      if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
      if (status === "delivered") updates.delivered_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from("delivery_assignments")
        .update(updates)
        .eq("id", assignmentId);
      if (error) throw error;

      // Update food order status
      const assignment = myAssignments?.find((a) => a.id === assignmentId);
      if (assignment) {
        await (supabase as any)
          .from("food_orders")
          .update({ status: status === "delivered" ? "delivered" : "in_transit" })
          .eq("id", assignment.order_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-deliveries"] });
      toast.success("Status updated!");
    },
  });

  const openInMaps = (lat: number | null, lng: number | null, address: string) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
    }
  };

  if (!riderProfile || riderProfile.status !== "approved") {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          You need to be an approved rider to access the delivery dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  const activeDeliveries = myAssignments?.filter((a) => !["delivered", "cancelled"].includes(a.status)) || [];
  const completedDeliveries = myAssignments?.filter((a) => a.status === "delivered") || [];

  return (
    <div className="space-y-4">
      {/* Rider Stats */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">₱{userCredits?.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{riderProfile.total_deliveries} deliveries</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Available</Label>
              <Switch
                checked={riderProfile.is_available}
                onCheckedChange={(checked) => toggleAvailableMutation.mutate(checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available" className="text-xs">Available</TabsTrigger>
          <TabsTrigger value="active" className="text-xs">
            Active ({activeDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-2 mt-2">
          {!riderProfile.is_available ? (
            <Alert>
              <AlertDescription className="text-xs">Turn on availability to see orders.</AlertDescription>
            </Alert>
          ) : availableOrders?.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No orders available right now.</p>
              </CardContent>
            </Card>
          ) : (
            availableOrders?.map((order: any) => (
              <Card key={order.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{order.food_vendors?.name}</h4>
                      <p className="text-xs text-muted-foreground">#{order.order_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₱{order.total_amount}</p>
                      <p className="text-xs text-muted-foreground">+₱{order.delivery_fee} fee</p>
                    </div>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{order.delivery_address}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={() => acceptOrderMutation.mutate(order)}
                    disabled={acceptOrderMutation.isPending || (userCredits || 0) < order.total_amount}
                  >
                    {(userCredits || 0) < order.total_amount
                      ? "Insufficient Credits"
                      : acceptOrderMutation.isPending
                      ? "Accepting..."
                      : "Accept Order"}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-2 mt-2">
          {activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-xs text-muted-foreground">No active deliveries.</p>
              </CardContent>
            </Card>
          ) : (
            activeDeliveries.map((delivery) => (
              <Card key={delivery.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{delivery.food_vendors?.name}</h4>
                      <Badge variant="outline" className="text-[10px]">{delivery.status}</Badge>
                    </div>
                    <p className="font-bold text-sm">₱{delivery.rider_credits_deducted}</p>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className="flex items-start gap-1">
                      <Package className="w-3 h-3 mt-0.5 text-primary" />
                      <span>Pickup: {delivery.pickup_address}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5 text-destructive" />
                      <span>Deliver: {delivery.customer_address}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <a href={`tel:${delivery.customer_phone}`} className="text-primary">
                        {delivery.customer_phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => openInMaps(
                        delivery.status === "assigned" ? delivery.pickup_latitude : delivery.customer_latitude,
                        delivery.status === "assigned" ? delivery.pickup_longitude : delivery.customer_longitude,
                        delivery.status === "assigned" ? delivery.pickup_address : delivery.customer_address
                      )}
                    >
                      <Navigation className="w-3 h-3 mr-1" /> Navigate
                    </Button>
                    {delivery.status === "assigned" && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => updateStatusMutation.mutate({ assignmentId: delivery.id, status: "picked_up" })}
                      >
                        Picked Up
                      </Button>
                    )}
                    {delivery.status === "picked_up" && (
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => updateStatusMutation.mutate({ assignmentId: delivery.id, status: "delivered" })}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Delivered
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-2">
          {completedDeliveries.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center">
                <p className="text-xs text-muted-foreground">No completed deliveries yet.</p>
              </CardContent>
            </Card>
          ) : (
            completedDeliveries.slice(0, 10).map((delivery) => (
              <Card key={delivery.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{delivery.food_vendors?.name}</h4>
                      <p className="text-xs text-muted-foreground">{delivery.customer_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₱{delivery.rider_credits_deducted}</p>
                      <Badge className="bg-green-500 text-[10px]">Delivered</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};