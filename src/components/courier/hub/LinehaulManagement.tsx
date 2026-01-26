import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Plus, Package, ArrowRight } from "lucide-react";

const LinehaulManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [destinationHub, setDestinationHub] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");

  const { data: hubs } = useQuery({
    queryKey: ["courier-hubs"],
    queryFn: async () => {
      const { data } = await supabase.from("courier_hubs").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: activeTrips, refetch } = useQuery({
    queryKey: ["active-linehaul-trips"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_linehaul_trips")
        .select(`
          *,
          origin_hub:courier_hubs!courier_linehaul_trips_origin_hub_id_fkey(name, code),
          destination_hub:courier_hubs!courier_linehaul_trips_destination_hub_id_fkey(name, code),
          parcels:courier_linehaul_parcels(count)
        `)
        .in("status", ["loading", "in_transit"])
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createTripMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("courier-hub-operations", {
        body: {
          action: "create-linehaul",
          destination_hub_id: destinationHub,
          vehicle_number: vehicleNumber,
          driver_name: driverName,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Linehaul trip created" });
      setIsCreateOpen(false);
      setDestinationHub("");
      setVehicleNumber("");
      setDriverName("");
      queryClient.invalidateQueries({ queryKey: ["active-linehaul-trips"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Linehaul Trips</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Linehaul Trip</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Destination Hub</Label>
                <Select value={destinationHub} onValueChange={setDestinationHub}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination hub" />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs?.map((hub: any) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        {hub.name} ({hub.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  placeholder="e.g., ABC-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Name</Label>
                <Input
                  placeholder="Driver name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createTripMutation.mutate()}
                disabled={!destinationHub || createTripMutation.isPending}
              >
                {createTripMutation.isPending ? "Creating..." : "Create Trip"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeTrips?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No active linehaul trips</p>
            </CardContent>
          </Card>
        ) : (
          activeTrips?.map((trip: any) => (
            <Card key={trip.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    {trip.trip_number}
                  </CardTitle>
                  <Badge variant={trip.status === "loading" ? "secondary" : "default"}>
                    {trip.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{trip.origin_hub?.name}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{trip.destination_hub?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span className="ml-2">{trip.vehicle_number || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="ml-2">{trip.driver_name || "N/A"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{trip.parcels?.[0]?.count || 0} parcels</span>
                </div>
                <div className="flex gap-2">
                  {trip.status === "loading" && (
                    <Button size="sm" className="flex-1">Dispatch</Button>
                  )}
                  {trip.status === "in_transit" && (
                    <Button size="sm" className="flex-1">Mark Arrived</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LinehaulManagement;
