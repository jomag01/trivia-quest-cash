import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Loader2, X } from "lucide-react";
import { uploadToAWS } from "@/lib/awsMedia";

interface EditRestaurantDialogProps {
  vendor: any;
  onClose: () => void;
}

export const EditRestaurantDialog = ({ vendor, onClose }: EditRestaurantDialogProps) => {
  const queryClient = useQueryClient();
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
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
    banner_url: vendor.banner_url || "",
    opening_time: vendor.opening_time || "08:00",
    closing_time: vendor.closing_time || "22:00",
    total_tables: vendor.total_tables?.toString() || "0",
  });

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const result = await uploadToAWS(file, `restaurants/${vendor.id}`);
      if (result?.cdnUrl) {
        setFormData({ ...formData, banner_url: result.cdnUrl });
        toast.success("Banner uploaded!");
      } else {
        toast.error("Failed to upload banner");
      }
    } catch (error) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("food_vendors")
        .update({
          name: formData.name,
          description: formData.description,
          cuisine_type: formData.cuisine_type,
          address: formData.address,
          phone: formData.phone,
          minimum_order: parseFloat(formData.minimum_order) || 0,
          delivery_fee: parseFloat(formData.delivery_fee) || 0,
          estimated_delivery_time: formData.estimated_delivery_time,
          banner_url: formData.banner_url || null,
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          total_tables: parseInt(formData.total_tables) || 0,
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
        {/* Banner Image Upload */}
        <div>
          <Label>Banner Image</Label>
          <div className="mt-2">
            {formData.banner_url ? (
              <div className="relative">
                <img
                  src={formData.banner_url}
                  alt="Banner"
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setFormData({ ...formData, banner_url: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => bannerInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-center">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Upload banner</span>
                  </div>
                )}
              </div>
            )}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBannerUpload}
              className="hidden"
            />
          </div>
        </div>

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

        {/* Operating Hours */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Opening Time</Label>
            <Input
              type="time"
              value={formData.opening_time}
              onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
            />
          </div>
          <div>
            <Label>Closing Time</Label>
            <Input
              type="time"
              value={formData.closing_time}
              onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
            />
          </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Estimated Delivery Time</Label>
            <Input
              value={formData.estimated_delivery_time}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_time: e.target.value })}
            />
          </div>
          <div>
            <Label>Total Tables</Label>
            <Input
              type="number"
              value={formData.total_tables}
              onChange={(e) => setFormData({ ...formData, total_tables: e.target.value })}
              placeholder="Number of tables"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !formData.name || uploading}
          className="flex-1"
        >
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
