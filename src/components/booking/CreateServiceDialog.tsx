import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X, Plane, Car, Package, MapPin, Plus, Shield, AlertCircle } from "lucide-react";
import ProviderVerificationDialog from "./ProviderVerificationDialog";

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

const TRAVEL_CATEGORIES = ["Travel & Tours", "Transportation", "Tour Packages"];

const CreateServiceDialog = ({ open, onOpenChange }: CreateServiceDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [newDestination, setNewDestination] = useState("");
  const [includes, setIncludes] = useState<string[]>([]);
  const [newInclude, setNewInclude] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    duration_minutes: "60",
    diamond_reward: "0",
    referral_commission_diamonds: "0",
    service_type: "standard",
    package_type: "",
    max_guests: "1",
    pickup_location: "",
    meeting_point: ""
  });

  useEffect(() => {
    fetchCategories();
    if (user) checkVerification();
  }, [user]);

  useEffect(() => {
    // Check if selected category is travel-related
    if (TRAVEL_CATEGORIES.some(c => formData.category.toLowerCase().includes(c.toLowerCase()))) {
      setFormData(prev => ({ ...prev, service_type: "travel_tour" }));
    } else {
      setFormData(prev => ({ ...prev, service_type: "standard" }));
    }
  }, [formData.category]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("service_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setCategories(data);
  };

  const checkVerification = async () => {
    if (!user) return;
    const { data } = await (supabase
      .from("profiles")
      .select("is_verified_service_provider")
      .eq("id", user.id)
      .single() as any);
    setIsVerified(data?.is_verified_service_provider ?? false);
  };

  const addDestination = () => {
    if (newDestination.trim() && !destinations.includes(newDestination.trim())) {
      setDestinations([...destinations, newDestination.trim()]);
      setNewDestination("");
    }
  };

  const removeDestination = (dest: string) => {
    setDestinations(destinations.filter(d => d !== dest));
  };

  const addInclude = () => {
    if (newInclude.trim() && !includes.includes(newInclude.trim())) {
      setIncludes([...includes, newInclude.trim()]);
      setNewInclude("");
    }
  };

  const removeInclude = (item: string) => {
    setIncludes(includes.filter(i => i !== item));
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
      
      const { data: uploadData, error: uploadError } = await uploadToStorage("service-images", fileName, imageFile);

      if (!uploadError && uploadData?.publicUrl) {
        imageUrl = uploadData.publicUrl;
      }
    }

    const serviceData: any = {
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
      is_active: true,
      service_type: formData.service_type,
      max_guests: parseInt(formData.max_guests)
    };

    // Add travel-specific fields if travel_tour type
    if (formData.service_type === "travel_tour") {
      serviceData.package_type = formData.package_type;
      serviceData.destinations = destinations;
      serviceData.includes = includes;
      serviceData.pickup_location = formData.pickup_location;
      serviceData.meeting_point = formData.meeting_point;
    }

    const { error } = await supabase.from("services").insert(serviceData);

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
      referral_commission_diamonds: "0",
      service_type: "standard",
      package_type: "",
      max_guests: "1",
      pickup_location: "",
      meeting_point: ""
    });
    setImageFile(null);
    setImagePreview(null);
    setDestinations([]);
    setIncludes([]);
  };

  const isTravelCategory = formData.service_type === "travel_tour";

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Service</DialogTitle>
        </DialogHeader>

        {/* Verification Warning */}
        {!isVerified && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  Identity Verification Required
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  For safety and trust, service providers must verify their identity before offering services.
                </p>
                <Button 
                  type="button"
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowVerification(true)}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Verify Now
                </Button>
              </div>
            </div>
          </div>
        )}

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

          {/* Travel/Tour Specific Fields */}
          {isTravelCategory && (
            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <h4 className="font-medium flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Travel Package Details
              </h4>

              {/* Package Type */}
              <div>
                <Label>Package Type *</Label>
                <Select 
                  value={formData.package_type} 
                  onValueChange={(v) => setFormData({ ...formData, package_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer_only">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Transfer Only (Airport/Point-to-Point)
                      </div>
                    </SelectItem>
                    <SelectItem value="car_rental">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        Car Rental with Driver
                      </div>
                    </SelectItem>
                    <SelectItem value="day_tour">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Day Tour Package
                      </div>
                    </SelectItem>
                    <SelectItem value="complete_package">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Complete Package (Transport + Tour + Accommodation)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Destinations */}
              <div>
                <Label>Destinations</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    placeholder="e.g., Boracay, Palawan"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDestination())}
                  />
                  <Button type="button" size="icon" onClick={addDestination}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {destinations.map((dest) => (
                    <Badge key={dest} variant="secondary" className="gap-1">
                      <MapPin className="h-3 w-3" />
                      {dest}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeDestination(dest)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* What's Included */}
              <div>
                <Label>What's Included</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newInclude}
                    onChange={(e) => setNewInclude(e.target.value)}
                    placeholder="e.g., Meals, Hotel, Guide"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInclude())}
                  />
                  <Button type="button" size="icon" onClick={addInclude}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {includes.map((item) => (
                    <Badge key={item} variant="outline" className="gap-1">
                      ✓ {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeInclude(item)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Max Guests & Pickup */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_guests">Max Guests</Label>
                  <Input
                    id="max_guests"
                    type="number"
                    min="1"
                    value={formData.max_guests}
                    onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="pickup_location">Pickup Location</Label>
                  <Input
                    id="pickup_location"
                    value={formData.pickup_location}
                    onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    placeholder="e.g., Airport, Hotel"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="meeting_point">Meeting Point</Label>
                <Input
                  id="meeting_point"
                  value={formData.meeting_point}
                  onChange={(e) => setFormData({ ...formData, meeting_point: e.target.value })}
                  placeholder="Exact meeting location details"
                />
              </div>
            </div>
          )}

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
              {!isVerified && " Identity verification is required for approval."}
            </p>
          </div>

          <Button type="submit" disabled={loading || !isVerified} className="w-full">
            {loading ? "Creating..." : !isVerified ? "Verify Identity First" : "Create Service"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>

    <ProviderVerificationDialog
      open={showVerification}
      onOpenChange={setShowVerification}
      onSuccess={checkVerification}
    />
    </>
  );
};

export default CreateServiceDialog;