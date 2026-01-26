import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, User, MapPin, Phone, Star, Package, Wallet } from "lucide-react";

const RiderManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRider, setNewRider] = useState({
    rider_name: "",
    phone_number: "",
    vehicle_type: "motorcycle",
    vehicle_plate: "",
    hub_id: "",
  });

  const { data: riders, isLoading } = useQuery({
    queryKey: ["admin-riders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("courier_riders" as any)
        .select(`
          *,
          hub:courier_hubs(hub_name, hub_code),
          user:auth_users_view(email)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter === "available") {
        query = query.eq("is_available", true);
      } else if (statusFilter === "busy") {
        query = query.eq("is_available", false);
      }

      const { data } = await query;
      return data || [];
    },
  });

  const { data: hubs } = useQuery({
    queryKey: ["courier-hubs-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_hubs")
        .select("id, hub_name, hub_code")
        .eq("is_active", true);
      return data || [];
    },
  });

  const updateRiderMutation = useMutation({
    mutationFn: async ({ riderId, updates }: { riderId: string; updates: any }) => {
      const { error } = await supabase
        .from("courier_riders" as any)
        .update(updates)
        .eq("id", riderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rider updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addRiderMutation = useMutation({
    mutationFn: async (riderData: typeof newRider) => {
      const { error } = await supabase
        .from("courier_riders" as any)
        .insert([{
          rider_name: riderData.rider_name,
          phone_number: riderData.phone_number,
          vehicle_type: riderData.vehicle_type,
          vehicle_plate: riderData.vehicle_plate,
          hub_id: riderData.hub_id || null,
          is_available: true,
          is_active: true,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rider added successfully" });
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      setIsAddDialogOpen(false);
      setNewRider({
        rider_name: "",
        phone_number: "",
        vehicle_type: "motorcycle",
        vehicle_plate: "",
        hub_id: "",
      });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAddRider = () => {
    if (!newRider.rider_name || !newRider.phone_number) {
      toast({ 
        title: "Validation Error", 
        description: "Rider name and phone number are required",
        variant: "destructive" 
      });
      return;
    }
    addRiderMutation.mutate(newRider);
  };

  const filteredRiders = (riders || []).filter((rider: any) =>
    rider.rider_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rider.rider_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search riders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Rider
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Rider</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rider_name">Rider Name *</Label>
                <Input
                  id="rider_name"
                  placeholder="Enter rider name"
                  value={newRider.rider_name}
                  onChange={(e) => setNewRider({ ...newRider, rider_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number *</Label>
                <Input
                  id="phone_number"
                  placeholder="e.g., +639123456789"
                  value={newRider.phone_number}
                  onChange={(e) => setNewRider({ ...newRider, phone_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Select
                  value={newRider.vehicle_type}
                  onValueChange={(value) => setNewRider({ ...newRider, vehicle_type: value })}
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle_plate">Vehicle Plate</Label>
                <Input
                  id="vehicle_plate"
                  placeholder="e.g., ABC1234"
                  value={newRider.vehicle_plate}
                  onChange={(e) => setNewRider({ ...newRider, vehicle_plate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hub_id">Assign to Hub (Optional)</Label>
                <Select
                  value={newRider.hub_id}
                  onValueChange={(value) => setNewRider({ ...newRider, hub_id: value })}
                >
                  <SelectTrigger id="hub_id">
                    <SelectValue placeholder="Select a hub" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {(hubs || []).map((hub: any) => (
                      <SelectItem key={hub.id} value={hub.id}>
                        {hub.hub_name} ({hub.hub_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddRider}
                  disabled={addRiderMutation.isPending}
                >
                  {addRiderMutation.isPending ? "Adding..." : "Add Rider"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRiders.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No riders found</p>
            </CardContent>
          </Card>
        ) : (
          filteredRiders.map((rider: any) => (
            <Card key={rider.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{rider.rider_name || rider.rider_code}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{rider.rider_code}</p>
                    </div>
                  </div>
                  <Badge variant={rider.is_available ? "default" : "secondary"}>
                    {rider.is_available ? "Available" : "Busy"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>{rider.hub?.hub_name || "Unassigned"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span>{rider.rating?.toFixed(1) || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span>{rider.total_deliveries} deliveries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3 w-3 text-muted-foreground" />
                    <span>₱{(rider.current_cash_on_hand || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Vehicle: </span>
                  <span className="capitalize">{rider.vehicle_type || "N/A"} - {rider.vehicle_plate || "N/A"}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() =>
                      updateRiderMutation.mutate({
                        riderId: rider.id,
                        updates: { is_available: !rider.is_available },
                      })
                    }
                  >
                    {rider.is_available ? "Set Busy" : "Set Available"}
                  </Button>
                  <Button size="sm" variant="outline">
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default RiderManagement;
