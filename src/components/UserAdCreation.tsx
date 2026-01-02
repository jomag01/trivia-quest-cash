import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Eye, MousePointerClick, ShoppingCart, DollarSign, MapPin, Users, Target, Smartphone, Globe, ChevronRight, Image } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateCustomAdDialog } from "@/components/seller/CreateCustomAdDialog";

interface UserAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  target_category: string | null;
  target_behavior: string[] | null;
  target_country: string | null;
  target_province: string | null;
  target_city: string | null;
  target_barangay: string | null;
  target_gender: string | null;
  target_age_min: number;
  target_age_max: number;
  target_interests: string[] | null;
  target_device: string[] | null;
  target_language: string | null;
  placement: string | null;
  objective: string | null;
  budget_diamonds: number;
  spent_diamonds: number;
  cost_per_view: number;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  status: string;
  created_at: string;
}

const PHILIPPINES_REGIONS = [
  { value: "NCR", label: "National Capital Region (NCR)" },
  { value: "CAR", label: "Cordillera Administrative Region" },
  { value: "Region I", label: "Region I - Ilocos Region" },
  { value: "Region II", label: "Region II - Cagayan Valley" },
  { value: "Region III", label: "Region III - Central Luzon" },
  { value: "Region IV-A", label: "Region IV-A - CALABARZON" },
  { value: "Region IV-B", label: "Region IV-B - MIMAROPA" },
  { value: "Region V", label: "Region V - Bicol Region" },
  { value: "Region VI", label: "Region VI - Western Visayas" },
  { value: "Region VII", label: "Region VII - Central Visayas" },
  { value: "Region VIII", label: "Region VIII - Eastern Visayas" },
  { value: "Region IX", label: "Region IX - Zamboanga Peninsula" },
  { value: "Region X", label: "Region X - Northern Mindanao" },
  { value: "Region XI", label: "Region XI - Davao Region" },
  { value: "Region XII", label: "Region XII - SOCCSKSARGEN" },
  { value: "Region XIII", label: "Region XIII - Caraga" },
  { value: "BARMM", label: "Bangsamoro Autonomous Region" },
];

const INTEREST_CATEGORIES = [
  { category: "Shopping & Fashion", items: ["Online Shopping", "Fashion & Style", "Beauty & Cosmetics", "Jewelry & Accessories", "Shoes & Bags"] },
  { category: "Entertainment", items: ["Music", "Movies", "Gaming", "K-Pop", "Anime", "TikTok Trends"] },
  { category: "Food & Dining", items: ["Food Lovers", "Cooking", "Restaurant Dining", "Fast Food", "Coffee & Tea"] },
  { category: "Technology", items: ["Mobile Devices", "Gadgets", "Tech News", "Apps & Software"] },
  { category: "Sports & Fitness", items: ["Basketball", "Fitness", "Running", "Volleyball", "Boxing", "Gym"] },
  { category: "Business", items: ["Entrepreneurship", "Investing", "Real Estate", "Networking", "E-commerce"] },
  { category: "Travel", items: ["Travel & Tourism", "Beach Destinations", "Adventure Travel", "Local Tourism"] },
  { category: "Education", items: ["Online Learning", "Career Development", "Skills Training", "College Life"] },
  { category: "Family & Parenting", items: ["Parenting", "Kids & Babies", "Family Activities", "Home & Living"] },
  { category: "Health & Wellness", items: ["Health Tips", "Mental Health", "Nutrition", "Skincare"] },
];

const OBJECTIVES = [
  { value: "awareness", label: "Brand Awareness", desc: "Reach people likely to remember your ad" },
  { value: "traffic", label: "Traffic", desc: "Drive visitors to your website or app" },
  { value: "engagement", label: "Engagement", desc: "Get more likes, comments, shares" },
  { value: "conversions", label: "Conversions", desc: "Drive valuable actions like purchases" },
  { value: "app_installs", label: "App Installs", desc: "Get more people to install your app" },
  { value: "video_views", label: "Video Views", desc: "Promote your video content" },
];

const PLACEMENTS = [
  { value: "feed", label: "In-Feed Ads", desc: "Native ads in the main feed" },
  { value: "top_view", label: "TopView", desc: "Premium placement at app launch" },
  { value: "brand_takeover", label: "Brand Takeover", desc: "Full-screen immersive ads" },
  { value: "spark_ads", label: "Spark Ads", desc: "Boost organic content" },
];

export const UserAdCreation = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<UserAd[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [userDiamonds, setUserDiamonds] = useState(0);
  
  // Form state - Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Form state - Targeting
  const [objective, setObjective] = useState("awareness");
  const [placement, setPlacement] = useState("feed");
  const [targetCountry, setTargetCountry] = useState("Philippines");
  const [targetProvince, setTargetProvince] = useState("all");
  const [targetCity, setTargetCity] = useState("");
  const [targetBarangay, setTargetBarangay] = useState("");
  const [targetGender, setTargetGender] = useState("all");
  const [ageRange, setAgeRange] = useState([18, 45]);
  const [targetInterests, setTargetInterests] = useState<string[]>([]);
  const [targetDevice, setTargetDevice] = useState<string[]>(["mobile", "desktop"]);
  const [targetLanguage, setTargetLanguage] = useState("all");
  const [targetCategory, setTargetCategory] = useState("");
  const [targetBehavior, setTargetBehavior] = useState<string[]>([]);
  
  // Form state - Budget
  const [budgetDiamonds, setBudgetDiamonds] = useState(100);
  const [costPerView, setCostPerView] = useState(0.1);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserDiamonds();
      fetchUserAds();
    }
  }, [user]);

  const fetchUserDiamonds = async () => {
    try {
      const { data } = await supabase
        .from("treasure_wallet")
        .select("diamonds")
        .eq("user_id", user?.id)
        .single();
      setUserDiamonds(data?.diamonds || 0);
    } catch (error: any) {
      console.error("Error fetching diamonds:", error);
    }
  };

  const fetchUserAds = async () => {
    try {
      const { data, error } = await supabase
        .from("user_ads")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      console.error("Error fetching ads:", error);
    }
  };

  const handleCreateAd = async () => {
    if (!title || (!imageFile && !videoFile)) {
      toast.error("Please provide a title and either an image or video");
      return;
    }

    if (budgetDiamonds < 10) {
      toast.error("Minimum budget is 10 diamonds");
      return;
    }

    if (userDiamonds < budgetDiamonds) {
      toast.error("Insufficient diamonds. Please purchase more diamonds.");
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      let videoUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await uploadToStorage("ads", fileName, imageFile);
        if (uploadError) throw uploadError;
        imageUrl = uploadData?.publicUrl || null;
      }

      if (videoFile) {
        const fileExt = videoFile.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await uploadToStorage("ads", fileName, videoFile);
        if (uploadError) throw uploadError;
        videoUrl = uploadData?.publicUrl || null;
      }

      const { data: adData, error: insertError } = await supabase.from("user_ads").insert({
        user_id: user?.id,
        title,
        description: description || null,
        image_url: imageUrl,
        video_url: videoUrl,
        link_url: linkUrl || null,
        target_category: targetCategory || null,
        target_behavior: targetBehavior.length > 0 ? targetBehavior : null,
        target_country: targetCountry || null,
        target_province: targetProvince === "all" ? null : targetProvince,
        target_city: targetCity || null,
        target_barangay: targetBarangay || null,
        target_gender: targetGender || null,
        target_age_min: ageRange[0],
        target_age_max: ageRange[1],
        target_interests: targetInterests.length > 0 ? targetInterests : null,
        target_device: targetDevice.length > 0 ? targetDevice : null,
        target_language: targetLanguage || null,
        placement,
        objective,
        budget_diamonds: budgetDiamonds,
        cost_per_view: costPerView,
        status: 'pending',
      } as any).select('id').single();

      if (insertError) throw insertError;

      // Deduct diamonds from user's wallet
      const { error: deductError } = await supabase
        .from("treasure_wallet")
        .update({ diamonds: userDiamonds - budgetDiamonds })
        .eq("user_id", user?.id);

      if (deductError) throw deductError;

      // Distribute ad revenue to commission pools (admin profit, unilevel, stairstep, leadership)
      if (adData?.id) {
        await supabase.rpc('distribute_ad_revenue', {
          p_ad_id: adData.id,
          p_seller_id: user?.id,
          p_total_amount: budgetDiamonds
        });
      }

      toast.success("Ad submitted for review! Admin will approve it shortly.");
      setDialogOpen(false);
      resetForm();
      fetchUserAds();
      fetchUserDiamonds(); // Refresh diamond balance
    } catch (error: any) {
      toast.error(error.message || "Failed to create ad");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLinkUrl("");
    setTargetCategory("");
    setTargetBehavior([]);
    setTargetCountry("Philippines");
    setTargetProvince("all");
    setTargetCity("");
    setTargetBarangay("");
    setTargetGender("all");
    setAgeRange([18, 45]);
    setTargetInterests([]);
    setTargetDevice(["mobile", "desktop"]);
    setTargetLanguage("all");
    setObjective("awareness");
    setPlacement("feed");
    setBudgetDiamonds(100);
    setCostPerView(0.1);
    setImageFile(null);
    setVideoFile(null);
    setCurrentStep(1);
  };

  const toggleInterest = (interest: string) => {
    setTargetInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleDevice = (device: string) => {
    setTargetDevice(prev =>
      prev.includes(device)
        ? prev.filter(d => d !== device)
        : [...prev, device]
    );
  };

  const toggleBehavior = (behavior: string) => {
    setTargetBehavior(prev =>
      prev.includes(behavior)
        ? prev.filter(b => b !== behavior)
        : [...prev, behavior]
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      active: "default",
      paused: "secondary",
      completed: "secondary",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const estimatedReach = Math.floor(budgetDiamonds / costPerView * (targetInterests.length > 0 ? 0.8 : 1));

  const renderAdCard = (ad: UserAd) => (
    <Card key={ad.id} className="p-3 md:p-4">
      <div className="flex gap-3 md:gap-4">
        {ad.image_url && (
          <img
            src={ad.image_url}
            alt={ad.title}
            className="w-16 h-16 md:w-24 md:h-24 object-cover rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm md:text-base truncate">{ad.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{ad.description}</p>
            </div>
            {getStatusBadge(ad.status)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
            <div className="flex items-center gap-1 text-xs">
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span>{ad.views_count}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <MousePointerClick className="w-3 h-3 text-muted-foreground" />
              <span>{ad.clicks_count}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <ShoppingCart className="w-3 h-3 text-muted-foreground" />
              <span>{ad.conversions_count}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <span>{ad.spent_diamonds}/{ad.budget_diamonds}💎</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Card className="p-3 md:p-6">
      <div className="space-y-4 md:space-y-6">
        {/* Diamond Balance Info */}
        <Card className="p-3 md:p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <div>
                <h3 className="font-semibold text-sm md:text-base">Your Diamond Balance</h3>
                <p className="text-xs text-muted-foreground">Used to pay for ad campaigns</p>
              </div>
            </div>
            <div className="text-xl font-bold text-amber-600">{userDiamonds.toLocaleString()}</div>
          </div>
        </Card>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg md:text-2xl font-bold">My Ad Campaigns</h2>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[95vh] p-0">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="text-lg">Create Targeted Ad Campaign</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-medium ${
                        currentStep >= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {step}
                      </div>
                      {step < 4 && <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground mx-1" />}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentStep === 1 && "Objective & Placement"}
                  {currentStep === 2 && "Audience Targeting"}
                  {currentStep === 3 && "Ad Creative"}
                  {currentStep === 4 && "Budget & Review"}
                </div>
              </DialogHeader>

              <ScrollArea className="h-[60vh] md:h-[65vh]">
                <div className="p-4 space-y-4">
                  {/* Step 1: Objective & Placement */}
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Target className="w-4 h-4" /> Campaign Objective
                        </Label>
                        <div className="grid gap-2 mt-2">
                          {OBJECTIVES.map((obj) => (
                            <Card
                              key={obj.value}
                              className={`p-3 cursor-pointer transition-all ${
                                objective === obj.value ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setObjective(obj.value)}
                            >
                              <div className="font-medium text-sm">{obj.label}</div>
                              <div className="text-xs text-muted-foreground">{obj.desc}</div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Ad Placement</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {PLACEMENTS.map((p) => (
                            <Card
                              key={p.value}
                              className={`p-3 cursor-pointer transition-all ${
                                placement === p.value ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                              }`}
                              onClick={() => setPlacement(p.value)}
                            >
                              <div className="font-medium text-xs md:text-sm">{p.label}</div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">{p.desc}</div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Audience Targeting */}
                  {currentStep === 2 && (
                    <div className="space-y-4">
                      {/* Location Targeting */}
                      <Card className="p-3 md:p-4">
                        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4" /> Location Targeting
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Country</Label>
                            <Select value={targetCountry} onValueChange={setTargetCountry}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Philippines">Philippines</SelectItem>
                                <SelectItem value="all">All Countries</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Region/Province</Label>
                            <Select value={targetProvince} onValueChange={setTargetProvince}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="All regions" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Regions</SelectItem>
                                {PHILIPPINES_REGIONS.map((region) => (
                                  <SelectItem key={region.value} value={region.value}>
                                    {region.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">City/Municipality</Label>
                            <Input
                              value={targetCity}
                              onChange={(e) => setTargetCity(e.target.value)}
                              placeholder="Enter city (optional)"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Barangay</Label>
                            <Input
                              value={targetBarangay}
                              onChange={(e) => setTargetBarangay(e.target.value)}
                              placeholder="Enter barangay (optional)"
                              className="h-9"
                            />
                          </div>
                        </div>
                      </Card>

                      {/* Demographics */}
                      <Card className="p-3 md:p-4">
                        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4" /> Demographics
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs">Gender</Label>
                            <div className="flex gap-2 mt-1">
                              {[
                                { value: "all", label: "All" },
                                { value: "male", label: "Male" },
                                { value: "female", label: "Female" },
                              ].map((g) => (
                                <Button
                                  key={g.value}
                                  type="button"
                                  variant={targetGender === g.value ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setTargetGender(g.value)}
                                  className="flex-1"
                                >
                                  {g.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Age Range: {ageRange[0]} - {ageRange[1]} years</Label>
                            <Slider
                              value={ageRange}
                              onValueChange={setAgeRange}
                              min={13}
                              max={65}
                              step={1}
                              className="mt-2"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Language</Label>
                            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Languages</SelectItem>
                                <SelectItem value="tagalog">Tagalog</SelectItem>
                                <SelectItem value="english">English</SelectItem>
                                <SelectItem value="cebuano">Cebuano</SelectItem>
                                <SelectItem value="ilocano">Ilocano</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>

                      {/* Device Targeting */}
                      <Card className="p-3 md:p-4">
                        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                          <Smartphone className="w-4 h-4" /> Device Targeting
                        </Label>
                        <div className="flex gap-2">
                          {["mobile", "desktop", "tablet"].map((device) => (
                            <Button
                              key={device}
                              type="button"
                              variant={targetDevice.includes(device) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleDevice(device)}
                              className="capitalize"
                            >
                              {device}
                            </Button>
                          ))}
                        </div>
                      </Card>

                      {/* Interest Targeting */}
                      <Card className="p-3 md:p-4">
                        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                          <Globe className="w-4 h-4" /> Interest Targeting
                          <Badge variant="secondary" className="ml-2">{targetInterests.length} selected</Badge>
                        </Label>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {INTEREST_CATEGORIES.map((cat) => (
                            <div key={cat.category}>
                              <div className="text-xs font-medium text-muted-foreground mb-1">{cat.category}</div>
                              <div className="flex flex-wrap gap-1">
                                {cat.items.map((interest) => (
                                  <Button
                                    key={interest}
                                    type="button"
                                    variant={targetInterests.includes(interest) ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => toggleInterest(interest)}
                                  >
                                    {interest}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      {/* Behavior Targeting */}
                      <Card className="p-3 md:p-4">
                        <Label className="text-sm font-medium mb-3 block">Target User Behavior</Label>
                        <div className="flex flex-wrap gap-2">
                          {['frequent_buyers', 'window_shoppers', 'deal_seekers', 'new_users', 'engaged_users'].map((behavior) => (
                            <Button
                              key={behavior}
                              type="button"
                              variant={targetBehavior.includes(behavior) ? "default" : "outline"}
                              size="sm"
                              onClick={() => toggleBehavior(behavior)}
                              className="capitalize text-xs"
                            >
                              {behavior.replace('_', ' ')}
                            </Button>
                          ))}
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Step 3: Ad Creative */}
                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Ad Title *</Label>
                        <Input
                          id="title"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Eye-catching title"
                          className="h-9"
                        />
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Describe your offer..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor="linkUrl">Destination URL</Label>
                        <Input
                          id="linkUrl"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          placeholder="https://..."
                          className="h-9"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="image">Ad Image *</Label>
                          <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="h-9"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Recommended: 1080x1920px (9:16)</p>
                        </div>
                        <div>
                          <Label htmlFor="video">Ad Video (Optional)</Label>
                          <Input
                            id="video"
                            type="file"
                            accept="video/*"
                            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                            className="h-9"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Max 60 seconds, MP4 format</p>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="targetCategory">Product Category</Label>
                        <Select value={targetCategory} onValueChange={setTargetCategory}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="electronics">Electronics</SelectItem>
                            <SelectItem value="fashion">Fashion</SelectItem>
                            <SelectItem value="home">Home & Garden</SelectItem>
                            <SelectItem value="beauty">Beauty & Health</SelectItem>
                            <SelectItem value="sports">Sports & Outdoors</SelectItem>
                            <SelectItem value="toys">Toys & Games</SelectItem>
                            <SelectItem value="books">Books & Media</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Budget & Review */}
                  {currentStep === 4 && (
                    <div className="space-y-4">
                      <Card className="p-4 bg-primary/5">
                        <h3 className="font-semibold mb-3">Budget & Bidding</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="budget">Total Budget (Diamonds) *</Label>
                            <Input
                              id="budget"
                              type="number"
                              min="10"
                              value={budgetDiamonds}
                              onChange={(e) => setBudgetDiamonds(parseInt(e.target.value) || 10)}
                              className="h-9"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Minimum: 10 diamonds</p>
                          </div>
                          <div>
                            <Label htmlFor="costPerView">Bid Per View (Diamonds)</Label>
                            <Input
                              id="costPerView"
                              type="number"
                              step="0.01"
                              min="0.05"
                              value={costPerView}
                              onChange={(e) => setCostPerView(parseFloat(e.target.value) || 0.1)}
                              className="h-9"
                            />
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h3 className="font-semibold mb-3">Estimated Performance</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-primary">{estimatedReach.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Est. Impressions</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">{Math.floor(estimatedReach * 0.02).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">Est. Clicks</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-primary">₱{(budgetDiamonds * 10 / estimatedReach * 1000).toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground">CPM</div>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <h3 className="font-semibold mb-3">Campaign Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Objective:</span>
                            <span className="capitalize">{objective.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Placement:</span>
                            <span className="capitalize">{placement.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span>{targetProvince || targetCountry || "All"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Age Range:</span>
                            <span>{ageRange[0]} - {ageRange[1]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gender:</span>
                            <span className="capitalize">{targetGender}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Interests:</span>
                            <span>{targetInterests.length || "All"}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-4 border-t flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  size="sm"
                >
                  Back
                </Button>
                {currentStep < 4 ? (
                  <Button onClick={() => setCurrentStep(currentStep + 1)} size="sm">
                    Continue
                  </Button>
                ) : (
                  <Button onClick={handleCreateAd} disabled={uploading} size="sm">
                    {uploading ? "Creating..." : "Submit Campaign"}
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ads List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-3">
            {ads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No ad campaigns yet. Create your first campaign!
              </p>
            ) : (
              ads.map(renderAdCard)
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-3 mt-3">
            {ads.filter(ad => ad.status === 'active').length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No active campaigns</p>
            ) : (
              ads.filter(ad => ad.status === 'active').map(renderAdCard)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-3">
            {ads.filter(ad => ad.status === 'pending').length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">No pending campaigns</p>
            ) : (
              ads.filter(ad => ad.status === 'pending').map(renderAdCard)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};