import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Plus, X } from "lucide-react";
import imageCompression from "browser-image-compression";

interface CreateMenuItemDialogProps {
  vendorId: string;
  onClose: () => void;
}

interface FoodMenu {
  id: string;
  name: string;
}

interface Variation {
  name: string;
  options: { label: string; priceAdjustment: number }[];
  isRequired: boolean;
}

interface AddOn {
  name: string;
  price: number;
}

export const CreateMenuItemDialog = ({ vendorId, onClose }: CreateMenuItemDialogProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    menu_id: "",
    category: "",
    preparation_time: "15-20 min",
    is_featured: false,
    bulk_enabled: false,
    bulk_price: "",
    bulk_min_quantity: "10",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [variations, setVariations] = useState<Variation[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [newVariation, setNewVariation] = useState({ name: "", options: "", isRequired: false });
  const [newAddOn, setNewAddOn] = useState({ name: "", price: "" });

  const { data: menus } = useQuery({
    queryKey: ["vendor-menus", vendorId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_menus")
        .select("id, name")
        .eq("vendor_id", vendorId)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as FoodMenu[];
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setImageFile(compressedFile);
        setImagePreview(URL.createObjectURL(compressedFile));
        toast.success("Image ready for upload");
      } catch (error) {
        console.error("Compression error:", error);
        toast.error("Failed to process image");
      }
    }
  };

  const addVariation = () => {
    if (!newVariation.name || !newVariation.options) {
      toast.error("Please fill in variation name and options");
      return;
    }
    const options = newVariation.options.split(",").map((opt) => {
      const parts = opt.trim().split(":");
      return {
        label: parts[0].trim(),
        priceAdjustment: parts[1] ? parseFloat(parts[1]) : 0,
      };
    });
    setVariations([...variations, { name: newVariation.name, options, isRequired: newVariation.isRequired }]);
    setNewVariation({ name: "", options: "", isRequired: false });
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const addAddOn = () => {
    if (!newAddOn.name || !newAddOn.price) {
      toast.error("Please fill in add-on name and price");
      return;
    }
    setAddOns([...addOns, { name: newAddOn.name, price: parseFloat(newAddOn.price) }]);
    setNewAddOn({ name: "", price: "" });
  };

  const removeAddOn = (index: number) => {
    setAddOns(addOns.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      let image_url = "";

      if (imageFile) {
        const path = `items/${vendorId}-${Date.now()}`;
        const { data, error } = await uploadToStorage("food-images", path, imageFile);
        if (error) {
          console.error("Upload error:", error);
          throw new Error(`Upload failed: ${error.message}`);
        }
        image_url = data?.publicUrl || "";
      }

      const { data: item, error } = await (supabase as any).from("food_items").insert({
        vendor_id: vendorId,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        menu_id: formData.menu_id || null,
        category: formData.category,
        preparation_time: formData.preparation_time,
        diamond_reward: 0, // Set by admin only
        referral_commission_diamonds: 0, // Set by admin only
        is_featured: formData.is_featured,
        image_url,
        bulk_enabled: formData.bulk_enabled,
        bulk_price: formData.bulk_enabled && formData.bulk_price ? parseFloat(formData.bulk_price) : null,
        bulk_min_quantity: formData.bulk_enabled ? parseInt(formData.bulk_min_quantity) || 10 : null,
      }).select().single();

      if (error) throw error;

      // Insert variations
      if (variations.length > 0) {
        const variationInserts = variations.map((v) => ({
          item_id: item.id,
          name: v.name,
          options: v.options,
          is_required: v.isRequired,
        }));
        await (supabase as any).from("food_item_variations").insert(variationInserts);
      }

      // Insert add-ons
      if (addOns.length > 0) {
        const addOnInserts = addOns.map((a) => ({
          item_id: item.id,
          name: a.name,
          price: a.price,
        }));
        await (supabase as any).from("food_item_addons").insert(addOnInserts);
      }
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
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add Menu Item</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Image Upload */}
        <div>
          <Label>Item Image</Label>
          <div className="mt-2">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-32 rounded-lg object-cover mb-2" />
            ) : (
              <div className="w-full h-32 rounded-lg bg-muted flex items-center justify-center mb-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Item Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Chicken Adobo"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Price (₱) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the dish"
            rows={2}
            className="text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Menu</Label>
            <Select value={formData.menu_id} onValueChange={(v) => setFormData({ ...formData, menu_id: v })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select menu" />
              </SelectTrigger>
              <SelectContent>
                {menus?.map((menu) => (
                  <SelectItem key={menu.id} value={menu.id}>{menu.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Main Course"
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Variations Section */}
        <div className="border rounded-lg p-3 space-y-2">
          <Label className="text-xs font-semibold">Variations (e.g., Size, Spice Level)</Label>
          <p className="text-[10px] text-muted-foreground">
            Options format: Small:0, Medium:20, Large:40 (name:price_adjustment)
          </p>
          
          {variations.map((v, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/50 p-2 rounded text-xs">
              <span className="flex-1">{v.name}: {v.options.map(o => `${o.label}(+₱${o.priceAdjustment})`).join(", ")}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVariation(i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Name (e.g., Size)"
              value={newVariation.name}
              onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Options: S:0,M:20,L:40"
              value={newVariation.options}
              onChange={(e) => setNewVariation({ ...newVariation, options: e.target.value })}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 text-xs" onClick={addVariation}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={newVariation.isRequired}
              onCheckedChange={(c) => setNewVariation({ ...newVariation, isRequired: c })}
              className="scale-75"
            />
            <span className="text-xs">Required selection</span>
          </div>
        </div>

        {/* Add-ons Section */}
        <div className="border rounded-lg p-3 space-y-2">
          <Label className="text-xs font-semibold">Add-ons (e.g., Extra Rice, Extra Sauce)</Label>
          
          {addOns.map((a, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/50 p-2 rounded text-xs">
              <span className="flex-1">{a.name}: +₱{a.price.toFixed(2)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAddOn(i)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Name"
              value={newAddOn.name}
              onChange={(e) => setNewAddOn({ ...newAddOn, name: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              type="number"
              placeholder="Price"
              value={newAddOn.price}
              onChange={(e) => setNewAddOn({ ...newAddOn, price: e.target.value })}
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 text-xs" onClick={addAddOn}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-xs">Preparation Time</Label>
          <Input
            value={formData.preparation_time}
            onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Featured Item</Label>
          <Switch
            checked={formData.is_featured}
            onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
          />
        </div>

        {/* Bulk Purchase Section */}
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.bulk_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, bulk_enabled: checked })}
              className="scale-75"
            />
            <Label className="text-xs font-semibold">Enable Bulk Purchase Option</Label>
          </div>
          {formData.bulk_enabled && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Bulk Price (₱)</Label>
                <Input
                  type="number"
                  value={formData.bulk_price}
                  onChange={(e) => setFormData({ ...formData, bulk_price: e.target.value })}
                  placeholder="Discounted bulk price"
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Min Quantity</Label>
                <Input
                  type="number"
                  min="2"
                  value={formData.bulk_min_quantity}
                  onChange={(e) => setFormData({ ...formData, bulk_min_quantity: e.target.value })}
                  placeholder="Min qty"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            Enable bulk pricing for large orders.
          </p>
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