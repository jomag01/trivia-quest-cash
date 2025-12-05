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
import { Upload } from "lucide-react";

interface CreateMenuItemDialogProps {
  vendorId: string;
  onClose: () => void;
}

export const CreateMenuItemDialog = ({ vendorId, onClose }: CreateMenuItemDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    preparation_time: "15-20 min",
    diamond_reward: "0",
    referral_commission_diamonds: "0",
    is_featured: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let image_url = "";

      if (imageFile) {
        const path = `items/${vendorId}-${Date.now()}`;
        const { data, error } = await supabase.storage
          .from("food-images")
          .upload(path, imageFile);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("food-images")
          .getPublicUrl(data.path);

        image_url = urlData.publicUrl;
      }

      const { error } = await (supabase as any).from("food_items").insert({
        vendor_id: vendorId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        preparation_time: formData.preparation_time,
        diamond_reward: parseInt(formData.diamond_reward) || 0,
        referral_commission_diamonds: parseInt(formData.referral_commission_diamonds) || 0,
        is_featured: formData.is_featured,
        image_url,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu-items"] });
      toast.success("Menu item added!");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add menu item");
    },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Add Menu Item</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Image Upload */}
        <div>
          <Label>Item Image</Label>
          <div className="mt-2">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-40 rounded-lg object-cover mb-2" />
            ) : (
              <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center mb-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <div>
          <Label>Item Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Chicken Adobo"
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the dish"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Price (₱) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Main Course"
            />
          </div>
        </div>

        <div>
          <Label>Preparation Time</Label>
          <Input
            value={formData.preparation_time}
            onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
            placeholder="e.g., 15-20 min"
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
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !formData.name || !formData.price}
          className="flex-1"
        >
          {createMutation.isPending ? "Adding..." : "Add Item"}
        </Button>
      </div>
    </div>
  );
};
