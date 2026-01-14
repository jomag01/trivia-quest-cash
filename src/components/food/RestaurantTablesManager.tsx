import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Table2, Users, Loader2, Clock, AlertCircle, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RestaurantTable {
  id: string;
  vendor_id: string;
  table_number: number;
  seats: number;
  description: string | null;
  is_available: boolean;
  created_at: string;
  current_reservation_id: string | null;
  occupied_since: string | null;
  expected_vacant_at: string | null;
}

interface VendorSettings {
  default_table_duration_hours: number;
  hourly_extension_fee: number;
  allow_waitlist: boolean;
  waitlist_buffer_minutes: number;
}

interface RestaurantTablesManagerProps {
  vendorId: string;
}

export const RestaurantTablesManager = ({ vendorId }: RestaurantTablesManagerProps) => {
  const queryClient = useQueryClient();
  const [newTable, setNewTable] = useState({
    table_number: "",
    seats: "4",
    description: "",
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Fetch vendor settings
  const { data: vendorSettings } = useQuery({
    queryKey: ["vendor-table-settings", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_vendors")
        .select("default_table_duration_hours, hourly_extension_fee, allow_waitlist, waitlist_buffer_minutes")
        .eq("id", vendorId)
        .maybeSingle();
      if (error) throw error;
      return (data || {
        default_table_duration_hours: 1,
        hourly_extension_fee: 0,
        allow_waitlist: true,
        waitlist_buffer_minutes: 60,
      }) as VendorSettings;
    },
  });

  // Fetch tables with occupation info
  const { data: tables, isLoading } = useQuery({
    queryKey: ["restaurant-tables", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_tables")
        .select("*, current_reservation_id, occupied_since, expected_vacant_at")
        .eq("vendor_id", vendorId)
        .order("table_number");
      if (error) throw error;
      return data as RestaurantTable[];
    },
  });

  // Add table mutation
  const addTableMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("restaurant_tables").insert({
        vendor_id: vendorId,
        table_number: parseInt(newTable.table_number),
        seats: parseInt(newTable.seats) || 4,
        description: newTable.description || null,
        is_available: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables", vendorId] });
      toast.success("Table added!");
      setNewTable({ table_number: "", seats: "4", description: "" });
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Table number already exists");
      } else {
        toast.error(error.message || "Failed to add table");
      }
    },
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await (supabase as any)
        .from("restaurant_tables")
        .update({ is_available })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables", vendorId] });
    },
    onError: () => {
      toast.error("Failed to update table");
    },
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("restaurant_tables")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables", vendorId] });
      toast.success("Table removed");
    },
    onError: () => {
      toast.error("Failed to remove table");
    },
  });

  // Update vendor settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<VendorSettings>) => {
      const { error } = await (supabase as any)
        .from("food_vendors")
        .update(settings)
        .eq("id", vendorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-table-settings", vendorId] });
      toast.success("Settings updated!");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  // Release table manually (force free)
  const releaseTableMutation = useMutation({
    mutationFn: async (tableId: string) => {
      const { error } = await (supabase as any)
        .from("restaurant_tables")
        .update({
          current_reservation_id: null,
          occupied_since: null,
          expected_vacant_at: null,
        })
        .eq("id", tableId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables", vendorId] });
      toast.success("Table released!");
    },
    onError: () => {
      toast.error("Failed to release table");
    },
  });

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Table2 className="w-4 h-4" />
          Manage Tables
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Table Settings */}
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Table Duration & Fees
              </span>
              <span className="text-xs text-muted-foreground">
                {vendorSettings?.default_table_duration_hours || 1}hr / ₱{vendorSettings?.hourly_extension_fee || 0}/hr extra
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border">
              <div>
                <Label className="text-xs">Default Duration (hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="8"
                  value={vendorSettings?.default_table_duration_hours || 1}
                  onChange={(e) => updateSettingsMutation.mutate({ 
                    default_table_duration_hours: parseFloat(e.target.value) || 1 
                  })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Extension Fee (₱/hour)</Label>
                <Input
                  type="number"
                  min="0"
                  value={vendorSettings?.hourly_extension_fee || 0}
                  onChange={(e) => updateSettingsMutation.mutate({ 
                    hourly_extension_fee: parseFloat(e.target.value) || 0 
                  })}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">Waitlist Wait Time (min)</Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={vendorSettings?.waitlist_buffer_minutes || 60}
                  onChange={(e) => updateSettingsMutation.mutate({ 
                    waitlist_buffer_minutes: parseInt(e.target.value) || 60 
                  })}
                  className="h-8"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <Switch
                  checked={vendorSettings?.allow_waitlist ?? true}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ 
                    allow_waitlist: checked 
                  })}
                />
                <Label className="text-xs">Allow Waitlist</Label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        {/* Add New Table Form */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Table #</Label>
            <Input
              type="number"
              value={newTable.table_number}
              onChange={(e) => setNewTable({ ...newTable, table_number: e.target.value })}
              placeholder="1"
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Seats</Label>
            <Input
              type="number"
              value={newTable.seats}
              onChange={(e) => setNewTable({ ...newTable, seats: e.target.value })}
              placeholder="4"
              className="h-9"
            />
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              onClick={() => addTableMutation.mutate()}
              disabled={!newTable.table_number || addTableMutation.isPending}
              className="w-full"
            >
              {addTableMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Tables List */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tables && tables.length > 0 ? (
          <div className="space-y-2">
            {tables.map((table) => {
              const isOccupied = !!table.current_reservation_id;
              
              return (
                <div
                  key={table.id}
                  className={`p-3 rounded-lg border ${
                    isOccupied 
                      ? "bg-destructive/5 border-destructive/20" 
                      : table.is_available 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={isOccupied ? "destructive" : table.is_available ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        Table {table.table_number}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {table.seats}
                      </span>
                      {isOccupied && (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          In Use
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {isOccupied ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => releaseTableMutation.mutate(table.id)}
                        >
                          Free Table
                        </Button>
                      ) : (
                        <>
                          <Switch
                            checked={table.is_available}
                            onCheckedChange={(checked) =>
                              toggleAvailabilityMutation.mutate({ id: table.id, is_available: checked })
                            }
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteTableMutation.mutate(table.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {isOccupied && table.occupied_since && (
                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Since {format(new Date(table.occupied_since), "h:mm a")}</span>
                      {table.expected_vacant_at && (
                        <span>• Expected free: {format(new Date(table.expected_vacant_at), "h:mm a")}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            No tables configured. Add tables above.
          </p>
        )}

        {tables && tables.length > 0 && (
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>
              {tables.filter((t) => t.is_available && !t.current_reservation_id).length} available / 
              {tables.filter((t) => t.current_reservation_id).length} occupied / 
              {tables.length} total
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};