import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Table2, Users, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface RestaurantTable {
  id: string;
  vendor_id: string;
  table_number: number;
  seats: number;
  description: string | null;
  is_available: boolean;
  created_at: string;
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

  // Fetch tables
  const { data: tables, isLoading } = useQuery({
    queryKey: ["restaurant-tables", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_tables")
        .select("*")
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

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Table2 className="w-4 h-4" />
          Manage Tables
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
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
          <div className="grid grid-cols-2 gap-2">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`p-2 rounded-lg border flex items-center justify-between ${
                  table.is_available ? "bg-primary/5 border-primary/20" : "bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Badge variant={table.is_available ? "default" : "secondary"} className="text-xs">
                    Table {table.table_number}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {table.seats}
                  </span>
                </div>
                <div className="flex items-center gap-1">
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            No tables configured. Add tables above.
          </p>
        )}

        {tables && tables.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {tables.filter((t) => t.is_available).length} of {tables.length} tables available
          </p>
        )}
      </CardContent>
    </Card>
  );
};