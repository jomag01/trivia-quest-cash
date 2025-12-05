import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Menu, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MenuManagementProps {
  vendorId: string;
}

interface FoodMenu {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export const MenuManagement = ({ vendorId }: MenuManagementProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editMenu, setEditMenu] = useState<FoodMenu | null>(null);
  const [deleteMenu, setDeleteMenu] = useState<FoodMenu | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // Check user's diamond balance
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: menus, isLoading } = useQuery({
    queryKey: ["vendor-menus", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_menus")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("display_order");
      if (error) throw error;
      return data as FoodMenu[];
    },
  });

  const isQualified = (profile?.credits || 0) >= 150;
  const canAddMore = isQualified || (menus?.length || 0) < 3;

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("food_menus").insert({
        vendor_id: vendorId,
        name: formData.name,
        description: formData.description || null,
        display_order: (menus?.length || 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menus"] });
      toast.success("Menu created!");
      setCreateOpen(false);
      setFormData({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create menu");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editMenu) return;
      const { error } = await (supabase as any)
        .from("food_menus")
        .update({
          name: formData.name,
          description: formData.description || null,
        })
        .eq("id", editMenu.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menus"] });
      toast.success("Menu updated!");
      setEditMenu(null);
      setFormData({ name: "", description: "" });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update menu");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("food_menus").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menus"] });
      toast.success("Menu deleted");
      setDeleteMenu(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete menu");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("food_menus")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menus"] });
    },
  });

  const openEdit = (menu: FoodMenu) => {
    setFormData({ name: menu.name, description: menu.description || "" });
    setEditMenu(menu);
  };

  if (isLoading) {
    return <div className="animate-pulse h-32 bg-muted rounded-lg" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Menus ({menus?.length || 0}{!isQualified ? "/3" : ""})</h3>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          disabled={!canAddMore}
          className="text-xs h-8"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Menu
        </Button>
      </div>

      {!isQualified && (
        <Alert variant="default" className="py-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            Reach 150💎 to add unlimited menus. Currently limited to 3.
          </AlertDescription>
        </Alert>
      )}

      {menus?.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <Menu className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No menus yet. Create your first menu!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {menus?.map((menu) => (
            <Card key={menu.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm truncate">{menu.name}</h4>
                    {!menu.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                  </div>
                  {menu.description && (
                    <p className="text-xs text-muted-foreground truncate">{menu.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <Switch
                    checked={menu.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({ id: menu.id, is_active: checked })
                    }
                    className="scale-75"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(menu)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteMenu(menu)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Create Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Menu Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Breakfast, Lunch, Dinner"
                className="text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="flex-1 text-xs h-8">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !formData.name}
                className="flex-1 text-xs h-8"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMenu} onOpenChange={() => setEditMenu(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Menu Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-sm h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditMenu(null)} className="flex-1 text-xs h-8">
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !formData.name}
                className="flex-1 text-xs h-8"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteMenu} onOpenChange={() => setDeleteMenu(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete Menu</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Delete "{deleteMenu?.name}"? Items in this menu will be unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMenu && deleteMutation.mutate(deleteMenu.id)}
              className="bg-destructive text-destructive-foreground text-xs h-8"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};