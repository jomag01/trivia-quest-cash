import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Edit, Image, Video, Eye, EyeOff } from "lucide-react";

interface PromotionalAd {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  media_url: string;
  thumbnail_url: string | null;
  cta_text: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
}

export default function PromotionalAdsManagement() {
  const [ads, setAds] = useState<PromotionalAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<PromotionalAd | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    media_type: "image" as string,
    media_url: "",
    thumbnail_url: "",
    cta_text: "Join Now",
    display_order: 0,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_ads")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      console.error("Error fetching promotional ads:", error);
      toast.error("Failed to load promotional ads");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "media_url" | "thumbnail_url"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `promotional-ads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("promotional-ads")
        .upload(filePath, file);

      if (uploadError) {
        // Try creating bucket if it doesn't exist
        const { error: bucketError } = await supabase.storage.createBucket("promotional-ads", {
          public: true,
        });
        
        if (!bucketError) {
          const { error: retryError } = await supabase.storage
            .from("promotional-ads")
            .upload(filePath, file);
          if (retryError) throw retryError;
        } else {
          throw uploadError;
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from("promotional-ads")
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, [field]: publicUrl }));
      toast.success("File uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.media_url) {
      toast.error("Title and media are required");
      return;
    }

    try {
      if (editingAd) {
        const { error } = await supabase
          .from("promotional_ads")
          .update({
            title: formData.title,
            description: formData.description || null,
            media_type: formData.media_type,
            media_url: formData.media_url,
            thumbnail_url: formData.thumbnail_url || null,
            cta_text: formData.cta_text || "Join Now",
            display_order: formData.display_order,
          })
          .eq("id", editingAd.id);

        if (error) throw error;
        toast.success("Promotional ad updated");
      } else {
        const { error } = await supabase
          .from("promotional_ads")
          .insert({
            title: formData.title,
            description: formData.description || null,
            media_type: formData.media_type,
            media_url: formData.media_url,
            thumbnail_url: formData.thumbnail_url || null,
            cta_text: formData.cta_text || "Join Now",
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast.success("Promotional ad created");
      }

      setDialogOpen(false);
      resetForm();
      fetchAds();
    } catch (error: any) {
      console.error("Error saving ad:", error);
      toast.error("Failed to save promotional ad");
    }
  };

  const togglePublish = async (ad: PromotionalAd) => {
    try {
      const { error } = await supabase
        .from("promotional_ads")
        .update({ is_published: !ad.is_published })
        .eq("id", ad.id);

      if (error) throw error;
      toast.success(ad.is_published ? "Ad unpublished" : "Ad published");
      fetchAds();
    } catch (error: any) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update ad status");
    }
  };

  const deleteAd = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotional ad?")) return;

    try {
      const { error } = await supabase
        .from("promotional_ads")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Promotional ad deleted");
      fetchAds();
    } catch (error: any) {
      console.error("Error deleting ad:", error);
      toast.error("Failed to delete promotional ad");
    }
  };

  const openEditDialog = (ad: PromotionalAd) => {
    setEditingAd(ad);
    setFormData({
      title: ad.title,
      description: ad.description || "",
      media_type: ad.media_type,
      media_url: ad.media_url,
      thumbnail_url: ad.thumbnail_url || "",
      cta_text: ad.cta_text || "Join Now",
      display_order: ad.display_order,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingAd(null);
    setFormData({
      title: "",
      description: "",
      media_type: "image",
      media_url: "",
      thumbnail_url: "",
      cta_text: "Join Now",
      display_order: 0,
    });
  };

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promotional Ads Creative</h2>
          <p className="text-muted-foreground">
            Create promotional content for users to share with their referral links
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Ad
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => (
          <Card key={ad.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {ad.media_type === "image" ? (
                <img
                  src={ad.media_url}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={ad.media_url}
                  poster={ad.thumbnail_url || undefined}
                  className="w-full h-full object-cover"
                  muted
                />
              )}
              <div className="absolute top-2 left-2">
                <Badge variant={ad.media_type === "image" ? "secondary" : "default"}>
                  {ad.media_type === "image" ? (
                    <Image className="w-3 h-3 mr-1" />
                  ) : (
                    <Video className="w-3 h-3 mr-1" />
                  )}
                  {ad.media_type}
                </Badge>
              </div>
              <div className="absolute top-2 right-2">
                <Badge variant={ad.is_published ? "default" : "outline"}>
                  {ad.is_published ? (
                    <Eye className="w-3 h-3 mr-1" />
                  ) : (
                    <EyeOff className="w-3 h-3 mr-1" />
                  )}
                  {ad.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <h3 className="font-semibold truncate">{ad.title}</h3>
              {ad.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ad.description}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePublish(ad)}
                >
                  {ad.is_published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(ad)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteAd(ad.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}

        {ads.length === 0 && (
          <Card className="col-span-full p-8 text-center">
            <p className="text-muted-foreground">
              No promotional ads yet. Create one to get started.
            </p>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? "Edit Promotional Ad" : "Create Promotional Ad"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Earn Passive Income with AI"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of the opportunity..."
                rows={3}
              />
            </div>

            <div>
              <Label>Media Type</Label>
              <Select
                value={formData.media_type}
                onValueChange={(value: string) =>
                  setFormData((prev) => ({ ...prev, media_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Media File *</Label>
              <Input
                type="file"
                accept={formData.media_type === "image" ? "image/*" : "video/*"}
                onChange={(e) => handleFileUpload(e, "media_url")}
                disabled={uploading}
              />
              {formData.media_url && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {formData.media_url}
                </p>
              )}
            </div>

            {formData.media_type === "video" && (
              <div>
                <Label>Thumbnail Image (optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "thumbnail_url")}
                  disabled={uploading}
                />
              </div>
            )}

            <div>
              <Label>CTA Button Text</Label>
              <Input
                value={formData.cta_text}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cta_text: e.target.value }))
                }
                placeholder="Join Now"
              />
            </div>

            <div>
              <Label>Display Order</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    display_order: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                className="flex-1"
              >
                {editingAd ? "Update" : "Create"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
