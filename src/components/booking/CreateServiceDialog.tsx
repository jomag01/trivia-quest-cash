import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const CreateServiceDialog = ({ open, onOpenChange }: CreateServiceDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    duration_minutes: "60",
    diamond_reward: "0",
    referral_commission_diamonds: "0"
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("service_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setCategories(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please log in to create a service");
      return;
    }

    if (!formData.title || !formData.category || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    let imageUrl = null;

    // Upload image if provided
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("service-images")
        .upload(fileName, imageFile);

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from("service-images")
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    const { error } = await supabase.from("services").insert({
      provider_id: user.id,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      price: parseFloat(formData.price),
      duration_minutes: parseInt(formData.duration_minutes),
      diamond_reward: parseInt(formData.diamond_reward),
      referral_commission_diamonds: parseInt(formData.referral_commission_diamonds),
      image_url: imageUrl,
      approval_status: "pending",
      is_active: true
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create service");
      console.error(error);
    } else {
      toast.success("Service created! Awaiting admin approval.");
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      price: "",
      duration_minutes: "60",
      diamond_reward: "0",
      referral_commission_diamonds: "0"
    });
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label>Service Image</Label>
            {imagePreview ? (
              <div className="relative mt-2">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-full h-40 object-cover rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 mt-2">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Click to upload image</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Service Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Professional Haircut"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your service..."
              rows={3}
            />
          </div>

          {/* Category */}
          <div>
            <Label>Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₱) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (mins)</Label>
              <Select 
                value={formData.duration_minutes} 
                onValueChange={(v) => setFormData({ ...formData, duration_minutes: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Diamond Rewards */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="diamond_reward">Diamond Reward 💎</Label>
              <Input
                id="diamond_reward"
                type="number"
                min="0"
                value={formData.diamond_reward}
                onChange={(e) => setFormData({ ...formData, diamond_reward: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Earned by customer on completion</p>
            </div>
            <div>
              <Label htmlFor="referral_commission">Referral Commission 💎</Label>
              <Input
                id="referral_commission"
                type="number"
                min="0"
                value={formData.referral_commission_diamonds}
                onChange={(e) => setFormData({ ...formData, referral_commission_diamonds: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">Earned by referrer</p>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">📝 Note</p>
            <p className="text-muted-foreground">
              Your service will be reviewed by admin before being listed publicly.
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateServiceDialog;