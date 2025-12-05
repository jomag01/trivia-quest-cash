import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface EditMenuItemDialogProps {
  item: any;
  onClose: () => void;
}

export const EditMenuItemDialog = ({ item, onClose }: EditMenuItemDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: item.name || "",
    description: item.description || "",
    price: item.price?.toString() || "",
    category: item.category || "",
    preparation_time: item.preparation_time || "15-20 min",
    diamond_reward: item.diamond_reward?.toString() || "0",
    referral_commission_diamonds: item.referral_commission_diamonds?.toString() || "0",
    is_featured: item.is_featured || false,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("food_items")
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          preparation_time: formData.preparation_time,
          diamond_reward: parseInt(formData.diamond_reward) || 0,
          referral_commission_diamonds: parseInt(formData.referral_commission_diamonds) || 0,
          is_featured: formData.is_featured,
        })
        .eq("id", item.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu-items"] });
      toast.success("Menu item updated!");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update menu item");
    },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit Menu Item</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Item Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Price (₱) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Preparation Time</Label>
          <Input
            value={formData.preparation_time}
            onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Diamond Reward</Label>
            <Input
              type="number"
              value={formData.diamond_reward}
              onChange={(e) => setFormData({ ...formData, diamond_reward: e.target.value })}
            />
          </div>
          <div>
            <Label>Referral Commission 💎</Label>
            <Input
              type="number"
              value={formData.referral_commission_diamonds}
              onChange={(e) => setFormData({ ...formData, referral_commission_diamonds: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label>Featured Item</Label>
          <Switch
            checked={formData.is_featured}
            onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !formData.name || !formData.price}
          className="flex-1"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
