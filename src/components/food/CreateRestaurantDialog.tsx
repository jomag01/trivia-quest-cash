import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import imageCompression from "browser-image-compression";
import { uploadToStorage } from "@/lib/storage";

interface CreateRestaurantDialogProps {
  onClose: () => void;
}

interface FoodCategory {
  id: string;
  name: string;
  icon: string | null;
}

export const CreateRestaurantDialog = ({ onClose }: CreateRestaurantDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    cuisine_type: "",
    category_id: "",
    address: "",
    phone: "",
    email: "",
    minimum_order: "0",
    delivery_fee: "0",
    estimated_delivery_time: "30-45 min",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");

  const { data: categories } = useQuery({
    queryKey: ["food-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as FoodCategory[];
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "cover") => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB before compression)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      try {
        // Compress image
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: type === "logo" ? 512 : 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        
        if (type === "logo") {
          setLogoFile(compressedFile);
          setLogoPreview(URL.createObjectURL(compressedFile));
        } else {
          setCoverFile(compressedFile);
          setCoverPreview(URL.createObjectURL(compressedFile));
        }
        toast.success("Image ready for upload");
      } catch (error) {
        console.error("Compression error:", error);
        toast.error("Failed to process image");
      }
    }
  };

  const uploadImage = async (file: File, path: string): Promise<string> => {
    const { data, error } = await uploadToStorage("food-images", path, file);
    if (error) {
      console.error("Upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    return data?.publicUrl || "";
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      let logo_url = "";
      let cover_image_url = "";

      if (logoFile) {
        logo_url = await uploadImage(logoFile, `logos/${user.id}-${Date.now()}`);
      }

      if (coverFile) {
        cover_image_url = await uploadImage(coverFile, `covers/${user.id}-${Date.now()}`);
      }

      const { error } = await (supabase as any).from("food_vendors").insert({
        owner_id: user.id,
        name: formData.name,
        cuisine_type: formData.cuisine_type,
        category_id: formData.category_id || null,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        minimum_order: parseFloat(formData.minimum_order) || 0,
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        estimated_delivery_time: formData.estimated_delivery_time,
        logo_url,
        cover_image_url,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-food-vendor"] });
      toast.success("Restaurant created! Pending admin approval.");
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create restaurant");
    },
  });

  return (
    <div className="space-y-4">
      <DialogHeader>
        <DialogTitle>Create Your Restaurant</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {/* Logo Upload */}
        <div>
          <Label>Restaurant Logo</Label>
          <div className="mt-2 flex items-center gap-4">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-lg object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "logo")} />
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <Label>Cover Image</Label>
          <div className="mt-2">
            {coverPreview && (
              <img src={coverPreview} alt="Cover preview" className="w-full h-32 rounded-lg object-cover mb-2" />
            )}
            <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, "cover")} />
          </div>
        </div>

        <div>
          <Label>Restaurant Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your restaurant name"
          />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your restaurant"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cuisine Type</Label>
            <Input
              value={formData.cuisine_type}
              onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
              placeholder="e.g., Filipino, Chinese"
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Address</Label>
          <Textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Restaurant address"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contact number"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Contact email"
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
            placeholder="e.g., 30-45 min"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !formData.name}
          className="flex-1"
        >
          {createMutation.isPending ? "Creating..." : "Create Restaurant"}
        </Button>
      </div>
    </div>
  );
};
