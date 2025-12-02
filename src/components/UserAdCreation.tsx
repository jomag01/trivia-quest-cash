import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, TrendingUp, Eye, MousePointerClick, ShoppingCart, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  target_category: string | null;
  target_behavior: string[] | null;
  budget_diamonds: number;
  spent_diamonds: number;
  cost_per_view: number;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  status: string;
  created_at: string;
}

export const UserAdCreation = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState<UserAd[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [canCreateAds, setCanCreateAds] = useState(false);
  const [requirements, setRequirements] = useState({
    diamonds: 0,
    referrals: 0,
    stairStep: 0,
  });
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [targetCategory, setTargetCategory] = useState("");
  const [targetBehavior, setTargetBehavior] = useState<string[]>([]);
  const [budgetDiamonds, setBudgetDiamonds] = useState(100);
  const [costPerView, setCostPerView] = useState(0.1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      checkRequirements();
      fetchUserAds();
    }
  }, [user]);

  const checkRequirements = async () => {
    try {
      const { data, error } = await supabase.rpc('can_create_ads', {
        user_id_param: user?.id
      });

      if (error) throw error;
      setCanCreateAds(data === true);

      // Fetch actual values for display
      const [walletResult, referralsResult, rankResult] = await Promise.all([
        supabase.from("treasure_wallet").select("diamonds").eq("user_id", user?.id).single(),
        supabase.from("referrals").select("id").eq("referrer_id", user?.id),
        supabase.from("affiliate_current_rank").select("current_step").eq("user_id", user?.id).single()
      ]);

      setRequirements({
        diamonds: walletResult.data?.diamonds || 0,
        referrals: referralsResult.data?.length || 0,
        stairStep: rankResult.data?.current_step || 0,
      });
    } catch (error: any) {
      console.error("Error checking requirements:", error);
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
    if (!canCreateAds) {
      toast.error("You don't meet the requirements to create ads");
      return;
    }

    if (!title || (!imageFile && !videoFile)) {
      toast.error("Please provide a title and either an image or video");
      return;
    }

    if (budgetDiamonds < 10) {
      toast.error("Minimum budget is 10 diamonds");
      return;
    }

    setUploading(true);
    try {
      let imageUrl = null;
      let videoUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from("ads")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("ads")
          .getPublicUrl(data.path);
        imageUrl = publicUrl;
      }

      // Upload video if provided
      if (videoFile) {
        const fileExt = videoFile.name.split(".").pop();
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
        const { data, error: uploadError } = await supabase.storage
          .from("ads")
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("ads")
          .getPublicUrl(data.path);
        videoUrl = publicUrl;
      }

      // Create ad in database
      const { error: insertError } = await supabase.from("user_ads").insert({
        user_id: user?.id,
        title,
        description: description || null,
        image_url: imageUrl,
        video_url: videoUrl,
        link_url: linkUrl || null,
        target_category: targetCategory || null,
        target_behavior: targetBehavior.length > 0 ? targetBehavior : null,
        budget_diamonds: budgetDiamonds,
        cost_per_view: costPerView,
        status: 'pending',
      });

      if (insertError) throw insertError;

      toast.success("Ad submitted for review! Admin will approve it shortly.");
      setDialogOpen(false);
      resetForm();
      fetchUserAds();
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
    setBudgetDiamonds(100);
    setCostPerView(0.1);
    setImageFile(null);
    setVideoFile(null);
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

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Requirements Card */}
        <Card className="p-4 bg-muted/50">
          <h3 className="font-semibold mb-3">Ad Creation Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${requirements.diamonds >= 150 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>150+ Diamonds ({requirements.diamonds})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${requirements.referrals >= 2 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>2+ Referrals ({requirements.referrals})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${requirements.stairStep >= 2 ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Stair Step 2+ (Step {requirements.stairStep})</span>
            </div>
          </div>
        </Card>

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Ad Campaigns</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canCreateAds}>
                <Plus className="w-4 h-4 mr-2" />
                Create Ad Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Targeted Ad Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Ad Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Eye-catching title"
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
                  <Label htmlFor="linkUrl">Link URL</Label>
                  <Input
                    id="linkUrl"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="image">Ad Image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="video">Ad Video (Optional)</Label>
                    <Input
                      id="video"
                      type="file"
                      accept="video/*"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="targetCategory">Target Category</Label>
                  <Select value={targetCategory} onValueChange={setTargetCategory}>
                    <SelectTrigger>
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

                <div>
                  <Label>Target User Behavior</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['view', 'click', 'purchase', 'share', 'like'].map((behavior) => (
                      <Button
                        key={behavior}
                        type="button"
                        variant={targetBehavior.includes(behavior) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBehavior(behavior)}
                      >
                        {behavior}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (Diamonds) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      min="10"
                      value={budgetDiamonds}
                      onChange={(e) => setBudgetDiamonds(parseInt(e.target.value) || 10)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Minimum: 10 diamonds</p>
                  </div>
                  <div>
                    <Label htmlFor="costPerView">Cost Per View</Label>
                    <Input
                      id="costPerView"
                      type="number"
                      step="0.01"
                      min="0.05"
                      value={costPerView}
                      onChange={(e) => setCostPerView(parseFloat(e.target.value) || 0.1)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Est. Impressions: {Math.floor(budgetDiamonds / costPerView)}
                    </p>
                  </div>
                </div>

                <Button onClick={handleCreateAd} disabled={uploading} className="w-full">
                  {uploading ? "Creating..." : "Submit for Approval"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Ads List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Campaigns</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {ads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No ad campaigns yet. Create your first campaign to start advertising!
              </p>
            ) : (
              ads.map((ad) => (
                <Card key={ad.id} className="p-4">
                  <div className="flex gap-4">
                    {ad.image_url && (
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{ad.title}</h3>
                          <p className="text-sm text-muted-foreground">{ad.description}</p>
                        </div>
                        {getStatusBadge(ad.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <span>{ad.views_count} views</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                          <span>{ad.clicks_count} clicks</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                          <span>{ad.conversions_count} conversions</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>{ad.spent_diamonds}/{ad.budget_diamonds} 💎</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4 mt-4">
            {ads.filter(ad => ad.status === 'active').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active campaigns</p>
            ) : (
              ads.filter(ad => ad.status === 'active').map((ad) => (
                <Card key={ad.id} className="p-4">
                  {/* Same card content */}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {ads.filter(ad => ad.status === 'pending').length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending campaigns</p>
            ) : (
              ads.filter(ad => ad.status === 'pending').map((ad) => (
                <Card key={ad.id} className="p-4">
                  {/* Same card content */}
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};