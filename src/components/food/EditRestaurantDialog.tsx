import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface EditRestaurantDialogProps {
  vendor: any;
  onClose: () => void;
}

export const EditRestaurantDialog = ({ vendor, onClose }: EditRestaurantDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: vendor.name || "",
    description: vendor.description || "",
    cuisine_type: vendor.cuisine_type || "",
    address: vendor.address || "",
    phone: vendor.phone || "",
    email: vendor.email || "",
    minimum_order: vendor.minimum_order?.toString() || "0",
    delivery_fee: vendor.delivery_fee?.toString() || "0",
    estimated_delivery_time: vendor.estimated_delivery_time || "30-45 min",
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("food_vendors")
        .update({
          name: formData.name,
          description: formData.description,
          cuisine_type: formData.cuisine_type,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          minimum_order: parseFloat(formData.minimum_order) || 0,
          delivery_fee: parseFloat(formData.delivery_fee) || 0,
          estimated_delivery_time: formData.estimated_delivery_time,
        })
        .eq("id", vendor.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-food-vendor"] });
      toast.success("Restaurant updated!");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update restaurant");
    },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Edit Restaurant</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div>
          <Label>Restaurant Name *</Label>
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

        <div>
          <Label>Cuisine Type</Label>
          <Input
            value={formData.cuisine_type}
            onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
          />
        </div>

        <div>
          <Label>Address</Label>
          <Textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Order (₱)</Label>
            <Input
              type="number"
              value={formData.minimum_order}
              onChange={(e) => setFormData({ ...formData, minimum_order: e.target.value })}
            />
          </div>
          <div>
            <Label>Delivery Fee (₱)</Label>
            <Input
              type="number"
              value={formData.delivery_fee}
              onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Estimated Delivery Time</Label>
          <Input
            value={formData.estimated_delivery_time}
            onChange={(e) => setFormData({ ...formData, estimated_delivery_time: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !formData.name}
          className="flex-1"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
