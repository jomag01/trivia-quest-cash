import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UtensilsCrossed, Edit2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FoodItem {
  id: string;
  name: string;
  price: number;
  diamond_reward: number;
  referral_commission_diamonds: number;
  image_url: string | null;
  is_available: boolean;
  vendor_id: string;
  vendor?: { name: string } | null;
}

export const FoodItemRewardsManagement = () => {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [diamondReward, setDiamondReward] = useState("");
  const [referralCommission, setReferralCommission] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [diamondBasePrice, setDiamondBasePrice] = useState(10);

  // Fetch diamond price
  useQuery({
    queryKey: ["diamond-base-price"],
    queryFn: async () => {
      const { data } = await supabase
        .from("treasure_admin_settings")
        .select("setting_value")
        .eq("setting_key", "diamond_base_price")
        .maybeSingle();
      if (data) setDiamondBasePrice(parseFloat(data.setting_value));
      return data;
    },
  });

  // Fetch all food items
  const { data: items, isLoading } = useQuery({
    queryKey: ["admin-food-items"],
    queryFn: async () => {
      const { data: foodItems, error } = await (supabase as any)
        .from("food_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch vendor names
      const itemsWithVendors = await Promise.all(
        (foodItems || []).map(async (item: any) => {
          const { data: vendor } = await (supabase as any)
            .from("food_vendors")
            .select("name")
            .eq("id", item.vendor_id)
            .maybeSingle();
          return { ...item, vendor };
        })
      );

      return itemsWithVendors as FoodItem[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedItem) return;
      const { error } = await (supabase as any)
        .from("food_items")
        .update({
          diamond_reward: parseInt(diamondReward) || 0,
          referral_commission_diamonds: parseInt(referralCommission) || 0,
        })
        .eq("id", selectedItem.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-food-items"] });
      toast.success("Food item rewards updated!");
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update");
    },
  });

  const handleEditItem = (item: FoodItem) => {
    setSelectedItem(item);
    setDiamondReward(item.diamond_reward?.toString() || "0");
    setReferralCommission(item.referral_commission_diamonds?.toString() || "0");
  };

  const filteredItems = items?.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Food Item Rewards Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set diamond rewards for buyers and referral commissions for affiliates on food items
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by item or vendor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredItems?.map((item) => (
              <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.vendor?.name || "Unknown Vendor"}
                      </p>
                      <p className="text-sm font-medium">₱{item.price}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            Buyer: {item.diamond_reward || 0} 💎
                          </Badge>
                          <Badge variant="secondary">
                            Referral: {item.referral_commission_diamonds || 0} 💎
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditItem(item)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Set Rewards
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredItems?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No food items found
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Rewards Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set Food Item Rewards</DialogTitle>
            <DialogDescription>
              Configure rewards for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="diamondReward">Diamond Reward for Buyer 💎</Label>
              <Input
                id="diamondReward"
                type="number"
                min="0"
                value={diamondReward}
                onChange={(e) => setDiamondReward(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Diamonds credited to buyer's account upon delivery
              </p>
            </div>

            <div>
              <Label htmlFor="referralCommission">Referral Commission 💎</Label>
              <Input
                id="referralCommission"
                type="number"
                min="0"
                value={referralCommission}
                onChange={(e) => setReferralCommission(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Distributed to affiliates via unilevel, stair-step & leadership (₱{(parseInt(referralCommission) || 0) * diamondBasePrice} total)
              </p>
            </div>

            {selectedItem && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p><span className="text-muted-foreground">Item Price:</span> ₱{selectedItem.price}</p>
                <p><span className="text-muted-foreground">Vendor:</span> {selectedItem.vendor?.name}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedItem(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
