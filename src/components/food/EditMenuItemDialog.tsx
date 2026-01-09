import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Camera, Loader2, X } from "lucide-react";
import { uploadToAWS } from "@/lib/awsMedia";

interface EditMenuItemDialogProps {
  item: any;
  onClose: () => void;
}

interface Variation {
  id?: string;
  name: string;
  price_adjustment: number;
  is_available: boolean;
}

export const EditMenuItemDialog = ({ item, onClose }: EditMenuItemDialogProps) => {
  const queryClient = useQueryClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: item.name || "",
    description: item.description || "",
    price: item.price?.toString() || "",
    category: item.category || "",
    preparation_time: item.preparation_time || "15-20 min",
    is_featured: item.is_featured || false,
    image_url: item.image_url || "",
  });

  const [variations, setVariations] = useState<Variation[]>([]);
  const [newVariation, setNewVariation] = useState({ name: "", price_adjustment: 0 });

  // Fetch existing variations
  const { data: existingVariations } = useQuery({
    queryKey: ["item-variations", item.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_item_variations")
        .select("*")
        .eq("item_id", item.id)
        .order("display_order");
      if (error) throw error;
      return data as Variation[];
    },
    enabled: !!item.id,
  });

  // Initialize variations when data loads
  useState(() => {
    if (existingVariations) {
      setVariations(existingVariations);
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadToAWS(file, `food-items/${item.id}`);
      if (result?.cdnUrl) {
        setFormData({ ...formData, image_url: result.cdnUrl });
        toast.success("Image uploaded!");
      } else {
        toast.error("Failed to upload image");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addVariation = () => {
    if (!newVariation.name.trim()) {
      toast.error("Variation name is required");
      return;
    }
    setVariations([...variations, { ...newVariation, is_available: true }]);
    setNewVariation({ name: "", price_adjustment: 0 });
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update menu item
      const { error: itemError } = await (supabase as any)
        .from("food_items")
        .update({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          preparation_time: formData.preparation_time,
          is_featured: formData.is_featured,
          image_url: formData.image_url || null,
        })
        .eq("id", item.id);

      if (itemError) throw itemError;

      // Delete existing variations
      await (supabase as any)
        .from("food_item_variations")
        .delete()
        .eq("item_id", item.id);

      // Insert new variations
      if (variations.length > 0) {
        const { error: varError } = await (supabase as any)
          .from("food_item_variations")
          .insert(
            variations.map((v, index) => ({
              item_id: item.id,
              name: v.name,
              price_adjustment: v.price_adjustment,
              is_available: v.is_available,
              display_order: index,
            }))
          );

        if (varError) throw varError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["item-variations"] });
      toast.success("Menu item updated!");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update menu item");
    },
  });

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Menu Item</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Image Upload */}
        <div>
          <Label>Item Image</Label>
          <div className="mt-2">
            {formData.image_url ? (
              <div className="relative w-32 h-32">
                <img
                  src={formData.image_url}
                  alt="Item"
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => setFormData({ ...formData, image_url: "" })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => imageInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

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
            <Label>Base Price (₱) *</Label>
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

        <div className="flex items-center justify-between">
          <Label>Featured Item</Label>
          <Switch
            checked={formData.is_featured}
            onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
          />
        </div>

        {/* Variations Section */}
        <div className="border-t pt-4">
          <Label className="text-base font-semibold">Variations</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Add size, spice level, or other options
          </p>

          {variations.length > 0 && (
            <div className="space-y-2 mb-4">
              {variations.map((variation, index) => (
                <Card key={index}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{variation.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {variation.price_adjustment >= 0 ? "+" : ""}₱{variation.price_adjustment}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeVariation(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="e.g. Large, Extra Spicy"
              value={newVariation.name}
              onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="+₱"
              value={newVariation.price_adjustment || ""}
              onChange={(e) =>
                setNewVariation({ ...newVariation, price_adjustment: parseFloat(e.target.value) || 0 })
              }
              className="w-20"
            />
            <Button size="icon" onClick={addVariation}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !formData.name || !formData.price || uploading}
          className="flex-1"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
