import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Building2, Users, Package, Phone, Mail } from "lucide-react";

const HubManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newHub, setNewHub] = useState({
    hub_code: "",
    hub_name: "",
    hub_type: "branch",
    address: "",
    city: "",
    province: "",
    contact_phone: "",
    contact_email: "",
  });

  const { data: hubs, isLoading } = useQuery({
    queryKey: ["admin-hubs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_hubs")
        .select(`
          *,
          zone:courier_zones(zone_name),
          riders:courier_riders(count)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createHubMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courier_hubs").insert(newHub);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hub created successfully" });
      setIsCreateOpen(false);
      setNewHub({
        hub_code: "",
        hub_name: "",
        hub_type: "branch",
        address: "",
        city: "",
        province: "",
        contact_phone: "",
        contact_email: "",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-hubs"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleHubMutation = useMutation({
    mutationFn: async ({ hubId, isActive }: { hubId: string; isActive: boolean }) => {
      const { error } = await supabase.from("courier_hubs").update({ is_active: isActive }).eq("id", hubId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hub status updated" });
      queryClient.invalidateQueries({ queryKey: ["admin-hubs"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Hub Management</h2>
          <p className="text-sm text-muted-foreground">{hubs?.length || 0} hubs configured</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Hub
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Hub</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hub Code</Label>
                  <Input
                    placeholder="e.g., MNL-001"
                    value={newHub.hub_code}
                    onChange={(e) => setNewHub({ ...newHub, hub_code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hub Type</Label>
                  <Select
                    value={newHub.hub_type}
                    onValueChange={(v) => setNewHub({ ...newHub, hub_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="main">Main Hub</SelectItem>
                      <SelectItem value="sorting_center">Sorting Center</SelectItem>
                      <SelectItem value="branch">Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Hub Name</Label>
                <Input
                  placeholder="Hub name"
                  value={newHub.hub_name}
                  onChange={(e) => setNewHub({ ...newHub, hub_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="Full address"
                  value={newHub.address}
                  onChange={(e) => setNewHub({ ...newHub, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="City"
                    value={newHub.city}
                    onChange={(e) => setNewHub({ ...newHub, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Province</Label>
                  <Input
                    placeholder="Province"
                    value={newHub.province}
                    onChange={(e) => setNewHub({ ...newHub, province: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={newHub.contact_phone}
                    onChange={(e) => setNewHub({ ...newHub, contact_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    placeholder="Email"
                    value={newHub.contact_email}
                    onChange={(e) => setNewHub({ ...newHub, contact_email: e.target.value })}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => createHubMutation.mutate()}
                disabled={!newHub.hub_code || !newHub.hub_name || createHubMutation.isPending}
              >
                {createHubMutation.isPending ? "Creating..." : "Create Hub"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hubs?.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hubs configured</p>
            </CardContent>
          </Card>
        ) : (
          hubs?.map((hub: any) => (
            <Card key={hub.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{hub.hub_name}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{hub.hub_code}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="capitalize">
                      {hub.hub_type}
                    </Badge>
                    <Badge variant={hub.is_active ? "default" : "secondary"}>
                      {hub.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>
                    {hub.address}, {hub.city}, {hub.province}
                  </span>
                </div>
                {hub.contact_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{hub.contact_phone}</span>
                  </div>
                )}
                {hub.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{hub.contact_email}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{hub.riders?.[0]?.count || 0} riders</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    toggleHubMutation.mutate({ hubId: hub.id, isActive: !hub.is_active })
                  }
                >
                  {hub.is_active ? "Deactivate" : "Activate"}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default HubManagement;
