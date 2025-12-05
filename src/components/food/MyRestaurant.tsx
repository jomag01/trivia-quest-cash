import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store, UtensilsCrossed, ShoppingBag, Settings } from "lucide-react";
import { toast } from "sonner";
import { MenuItemsList } from "./MenuItemsList";
import { VendorOrders } from "./VendorOrders";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CreateMenuItemDialog } from "./CreateMenuItemDialog";
import { EditRestaurantDialog } from "./EditRestaurantDialog";

interface MyRestaurantProps {
  onCreateNew: () => void;
}

interface FoodVendor {
  id: string;
  name: string;
  logo_url: string | null;
  cuisine_type: string | null;
  approval_status: string;
  is_open: boolean;
}

export const MyRestaurant = ({ onCreateNew }: MyRestaurantProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("menu");
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [editRestaurantOpen, setEditRestaurantOpen] = useState(false);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["my-food-vendor", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_vendors")
        .select("*")
        .eq("owner_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as FoodVendor | null;
    },
    enabled: !!user,
  });

  const toggleOpenMutation = useMutation({
    mutationFn: async (isOpen: boolean) => {
      const { error } = await (supabase as any)
        .from("food_vendors")
        .update({ is_open: isOpen })
        .eq("id", vendor?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-food-vendor"] });
      toast.success(vendor?.is_open ? "Restaurant is now closed" : "Restaurant is now open");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Restaurant Yet</h3>
        <p className="text-muted-foreground mb-4">
          Start selling food by creating your restaurant
        </p>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Create Restaurant
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Restaurant Header */}
      <Card>
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
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{vendor.name}</h3>
                <Badge variant={vendor.approval_status === "approved" ? "default" : "secondary"}>
                  {vendor.approval_status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{vendor.cuisine_type}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Open</span>
                  <Switch
                    checked={vendor.is_open}
                    onCheckedChange={(checked) => toggleOpenMutation.mutate(checked)}
                    disabled={vendor.approval_status !== "approved"}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditRestaurantOpen(true)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {vendor.approval_status !== "approved" && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Your restaurant is pending approval. You can add menu items while waiting.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="menu">
            <UtensilsCrossed className="w-4 h-4 mr-1" />
            Menu
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-1" />
            Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Menu Items</h4>
            <Button size="sm" onClick={() => setCreateItemOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
          <MenuItemsList vendorId={vendor.id} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <VendorOrders vendorId={vendor.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <CreateMenuItemDialog
            vendorId={vendor.id}
            onClose={() => setCreateItemOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editRestaurantOpen} onOpenChange={setEditRestaurantOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <EditRestaurantDialog
            vendor={vendor}
            onClose={() => setEditRestaurantOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
