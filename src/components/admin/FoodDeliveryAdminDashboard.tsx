import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Building2, Users, TrendingUp, Settings, 
  Zap, DollarSign, Plus, Trash2, Edit
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FoodDeliveryAdminDashboard = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [newCityName, setNewCityName] = useState("");
  const [editingSurge, setEditingSurge] = useState<any>(null);

  // Fetch cities
  const { data: cities } = useQuery({
    queryKey: ["admin-cities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cities")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch system settings
  const { data: settings } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_settings")
        .select("*");
      if (error) throw error;
      return data?.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s }), {});
    },
  });

  // Fetch surge rules
  const { data: surgeRules } = useQuery({
    queryKey: ["surge-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("surge_rules")
        .select("*, cities(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch delivery pricing
  const { data: pricing } = useQuery({
    queryKey: ["delivery-pricing"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_pricing")
        .select("*, cities(name)");
      if (error) throw error;
      return data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["food-delivery-stats"],
    queryFn: async () => {
      const [ordersResult, driversResult, restaurantsResult, commissionsResult] = await Promise.all([
        (supabase as any).from("food_orders").select("id, total_amount, status"),
        (supabase as any).from("delivery_riders").select("id, status"),
        (supabase as any).from("food_vendors").select("id, status"),
        (supabase as any).from("order_commissions").select("commission_amount"),
      ]);

      const orders = ordersResult.data || [];
      const drivers = driversResult.data || [];
      const restaurants = restaurantsResult.data || [];
      const commissions = commissionsResult.data || [];

      return {
        totalOrders: orders.length,
        deliveredOrders: orders.filter((o: any) => o.status === "delivered").length,
        gmv: orders.filter((o: any) => o.status === "delivered").reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter((d: any) => d.status === "approved").length,
        totalRestaurants: restaurants.length,
        activeRestaurants: restaurants.filter((r: any) => r.status === "approved").length,
        totalCommissions: commissions.reduce((sum: number, c: any) => sum + (c.commission_amount || 0), 0),
      };
    },
  });

  // Mutations
  const toggleSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await (supabase as any)
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Setting updated");
    },
  });

  const addCityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("cities")
        .insert({ name: newCityName });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      setNewCityName("");
      toast.success("City added");
    },
  });

  const toggleCityMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("cities")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cities"] });
      toast.success("City updated");
    },
  });

  const addSurgeRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      const { error } = await (supabase as any)
        .from("surge_rules")
        .insert(rule);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["surge-rules"] });
      setEditingSurge(null);
      toast.success("Surge rule added");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Food Delivery Admin</h2>
        <Badge variant={settings?.sandbox_mode?.value === "true" ? "destructive" : "default"}>
          {settings?.sandbox_mode?.value === "true" ? "SANDBOX MODE" : "PRODUCTION"}
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">GMV</span>
            </div>
            <p className="text-xl font-bold">₱{(stats?.gmv || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Commissions</span>
            </div>
            <p className="text-xl font-bold">₱{(stats?.totalCommissions || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs">Restaurants</span>
            </div>
            <p className="text-xl font-bold">{stats?.activeRestaurants || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Drivers</span>
            </div>
            <p className="text-xl font-bold">{stats?.activeDrivers || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="cities" className="text-xs">Cities</TabsTrigger>
          <TabsTrigger value="surge" className="text-xs">Surge</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.totalOrders
                  ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                {stats?.deliveredOrders || 0} of {stats?.totalOrders || 0} orders delivered
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cities" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Cities</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" /> Add City
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New City</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>City Name</Label>
                        <Input
                          value={newCityName}
                          onChange={(e) => setNewCityName(e.target.value)}
                          placeholder="e.g., Cebu City"
                        />
                      </div>
                      <Button
                        onClick={() => addCityMutation.mutate()}
                        disabled={!newCityName || addCityMutation.isPending}
                      >
                        Add City
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cities?.map((city: any) => (
                  <div
                    key={city.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{city.name}</span>
                      <span className="text-xs text-muted-foreground">{city.country}</span>
                    </div>
                    <Switch
                      checked={city.is_active}
                      onCheckedChange={(checked) =>
                        toggleCityMutation.mutate({ id: city.id, is_active: checked })
                      }
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surge" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Surge Rules
                </span>
                <Dialog open={!!editingSurge} onOpenChange={(open) => !open && setEditingSurge(null)}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSurge({ trigger_type: "time", multiplier: 1.5 })}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Surge Rule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={editingSurge?.name || ""}
                          onChange={(e) => setEditingSurge({ ...editingSurge, name: e.target.value })}
                          placeholder="e.g., Lunch Rush"
                        />
                      </div>
                      <div>
                        <Label>City</Label>
                        <Select
                          value={editingSurge?.city_id}
                          onValueChange={(v) => setEditingSurge({ ...editingSurge, city_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select city" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities?.map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Trigger Type</Label>
                        <Select
                          value={editingSurge?.trigger_type}
                          onValueChange={(v) => setEditingSurge({ ...editingSurge, trigger_type: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="time">Time-based</SelectItem>
                            <SelectItem value="demand">High Demand</SelectItem>
                            <SelectItem value="weather">Weather</SelectItem>
                            <SelectItem value="event">Special Event</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={editingSurge?.start_time || ""}
                            onChange={(e) => setEditingSurge({ ...editingSurge, start_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={editingSurge?.end_time || ""}
                            onChange={(e) => setEditingSurge({ ...editingSurge, end_time: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Multiplier</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          max="3"
                          value={editingSurge?.multiplier || 1.5}
                          onChange={(e) =>
                            setEditingSurge({ ...editingSurge, multiplier: parseFloat(e.target.value) })
                          }
                        />
                      </div>
                      <Button
                        onClick={() => addSurgeRuleMutation.mutate(editingSurge)}
                        disabled={!editingSurge?.name || addSurgeRuleMutation.isPending}
                      >
                        Save Rule
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {surgeRules?.map((rule: any) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.cities?.name} • {rule.trigger_type} • {rule.start_time}-{rule.end_time}
                      </p>
                    </div>
                    <Badge variant={rule.is_active ? "default" : "secondary"}>
                      {rule.multiplier}x
                    </Badge>
                  </div>
                ))}
                {!surgeRules?.length && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No surge rules configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Sandbox Mode</p>
                  <p className="text-xs text-muted-foreground">Enable test mode (no real charges)</p>
                </div>
                <Switch
                  checked={settings?.sandbox_mode?.value === "true"}
                  onCheckedChange={(checked) =>
                    toggleSettingMutation.mutate({ key: "sandbox_mode", value: String(checked) })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Auto Dispatch</p>
                  <p className="text-xs text-muted-foreground">Automatically assign nearest driver</p>
                </div>
                <Switch
                  checked={settings?.auto_dispatch_enabled?.value === "true"}
                  onCheckedChange={(checked) =>
                    toggleSettingMutation.mutate({ key: "auto_dispatch_enabled", value: String(checked) })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Surge Pricing</p>
                  <p className="text-xs text-muted-foreground">Enable dynamic surge pricing</p>
                </div>
                <Switch
                  checked={settings?.surge_pricing_enabled?.value === "true"}
                  onCheckedChange={(checked) =>
                    toggleSettingMutation.mutate({ key: "surge_pricing_enabled", value: String(checked) })
                  }
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Default Commission Rate</p>
                  <p className="text-xs text-muted-foreground">Platform commission percentage</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 text-right"
                    value={settings?.default_commission_rate?.value || "20"}
                    onChange={(e) =>
                      toggleSettingMutation.mutate({ key: "default_commission_rate", value: e.target.value })
                    }
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">VAT Rate</p>
                  <p className="text-xs text-muted-foreground">BIR VAT rate</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-20 text-right"
                    value={settings?.vat_rate?.value || "12"}
                    onChange={(e) =>
                      toggleSettingMutation.mutate({ key: "vat_rate", value: e.target.value })
                    }
                  />
                  <span>%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
