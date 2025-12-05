import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Store, Check, X } from "lucide-react";

interface FoodVendor {
  id: string;
  name: string;
  logo_url: string | null;
  cuisine_type: string | null;
  address: string | null;
  approval_status: string;
  is_open: boolean;
  owner: { full_name: string | null; email: string | null } | null;
}

export const FoodCommissionManagement = () => {
  const queryClient = useQueryClient();
  const [commissionSettings, setCommissionSettings] = useState({
    food_unilevel_commission: "5",
    food_stairstep_commission: "3",
    food_leadership_commission: "2",
  });

  // Fetch commission settings
  const { data: settings } = useQuery({
    queryKey: ["food-commission-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("*")
        .in("setting_key", [
          "food_unilevel_commission",
          "food_stairstep_commission",
          "food_leadership_commission",
        ]);

      if (error) throw error;

      const settingsMap: Record<string, string> = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = s.setting_value;
      });

      setCommissionSettings((prev) => ({
        ...prev,
        ...settingsMap,
      }));

      return settingsMap;
    },
  });

  // Fetch pending vendors
  const { data: pendingVendors } = useQuery({
    queryKey: ["pending-food-vendors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_vendors")
        .select(`
          *,
          owner:profiles!food_vendors_owner_id_fkey(full_name, email)
        `)
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FoodVendor[];
    },
  });

  // Fetch all vendors for management
  const { data: allVendors } = useQuery({
    queryKey: ["all-food-vendors"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_vendors")
        .select(`
          *,
          owner:profiles!food_vendors_owner_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FoodVendor[];
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(commissionSettings)) {
        const { error } = await supabase
          .from("treasure_admin_settings")
          .upsert({
            setting_key: key,
            setting_value: value,
            description: `Food ${key.replace("food_", "").replace("_", " ")} percentage`,
          }, { onConflict: "setting_key" });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-commission-settings"] });
      toast.success("Commission settings saved!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const updateVendorStatusMutation = useMutation({
    mutationFn: async ({ vendorId, status }: { vendorId: string; status: string }) => {
      const { error } = await (supabase as any)
        .from("food_vendors")
        .update({ approval_status: status })
        .eq("id", vendorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-food-vendors"] });
      queryClient.invalidateQueries({ queryKey: ["all-food-vendors"] });
      toast.success("Vendor status updated!");
    },
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings">Commission Settings</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval ({pendingVendors?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="vendors">All Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Food Order Commission Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the commission percentages for food orders distributed through the affiliate system.
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Unilevel (7-Level Network) %</Label>
                  <Input
                    type="number"
                    value={commissionSettings.food_unilevel_commission}
                    onChange={(e) =>
                      setCommissionSettings((prev) => ({
                        ...prev,
                        food_unilevel_commission: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Distributed across 7 levels of uplines
                  </p>
                </div>

                <div>
                  <Label>Stair-Step Plan %</Label>
                  <Input
                    type="number"
                    value={commissionSettings.food_stairstep_commission}
                    onChange={(e) =>
                      setCommissionSettings((prev) => ({
                        ...prev,
                        food_stairstep_commission: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on affiliate rank levels
                  </p>
                </div>

                <div>
                  <Label>Leadership Bonus %</Label>
                  <Input
                    type="number"
                    value={commissionSettings.food_leadership_commission}
                    onChange={(e) =>
                      setCommissionSettings((prev) => ({
                        ...prev,
                        food_leadership_commission: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    For qualified leaders in the network
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium">Commission Breakdown Example</p>
                <p className="text-xs text-muted-foreground mt-1">
                  For a ₱500 food order with {commissionSettings.food_unilevel_commission}% +{" "}
                  {commissionSettings.food_stairstep_commission}% +{" "}
                  {commissionSettings.food_leadership_commission}% total commission:
                </p>
                <ul className="text-xs mt-2 space-y-1">
                  <li>
                    • Unilevel: ₱{((500 * parseFloat(commissionSettings.food_unilevel_commission || "0")) / 100).toFixed(2)}
                  </li>
                  <li>
                    • Stair-Step: ₱{((500 * parseFloat(commissionSettings.food_stairstep_commission || "0")) / 100).toFixed(2)}
                  </li>
                  <li>
                    • Leadership: ₱{((500 * parseFloat(commissionSettings.food_leadership_commission || "0")) / 100).toFixed(2)}
                  </li>
                </ul>
              </div>

              <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending}>
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <div className="space-y-4">
            {pendingVendors?.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No pending vendor approvals</p>
                </CardContent>
              </Card>
            ) : (
              pendingVendors?.map((vendor) => (
                <Card key={vendor.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {vendor.logo_url ? (
                        <img
                          src={vendor.logo_url}
                          alt={vendor.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <Store className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{vendor.name}</h4>
                        <p className="text-sm text-muted-foreground">{vendor.cuisine_type}</p>
                        <p className="text-sm">Owner: {vendor.owner?.full_name || vendor.owner?.email}</p>
                        <p className="text-sm text-muted-foreground">{vendor.address}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateVendorStatusMutation.mutate({
                              vendorId: vendor.id,
                              status: "approved",
                            })
                          }
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            updateVendorStatusMutation.mutate({
                              vendorId: vendor.id,
                              status: "rejected",
                            })
                          }
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="mt-4">
          <div className="space-y-4">
            {allVendors?.map((vendor) => (
              <Card key={vendor.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {vendor.logo_url ? (
                        <img
                          src={vendor.logo_url}
                          alt={vendor.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                          <Store className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium">{vendor.name}</h4>
                        <p className="text-sm text-muted-foreground">{vendor.owner?.full_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          vendor.approval_status === "approved"
                            ? "default"
                            : vendor.approval_status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {vendor.approval_status}
                      </Badge>
                      <Badge variant={vendor.is_open ? "default" : "outline"}>
                        {vendor.is_open ? "Open" : "Closed"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
