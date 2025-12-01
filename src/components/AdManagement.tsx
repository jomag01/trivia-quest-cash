import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const AdManagement = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setAds(data);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const handleCreateAd = async () => {
    if (!title || !imageFile) {
      toast.error("Please provide title and image");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("ads")
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ads")
        .getPublicUrl(data.path);

      const { error: insertError } = await supabase.from("ads").insert({
        title,
        image_url: publicUrl,
        link_url: linkUrl || null,
        display_order: displayOrder,
        is_active: true,
      });

      if (insertError) throw insertError;

      toast.success("Ad created successfully!");
      setDialogOpen(false);
      setTitle("");
      setLinkUrl("");
      setDisplayOrder(0);
      setImageFile(null);
      fetchAds();
    } catch (error: any) {
      toast.error(error.message || "Failed to create ad");
    } finally {
      setUploading(false);
    }
  };

  const toggleAdStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("ads")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update ad status");
    } else {
      toast.success("Ad status updated");
      fetchAds();
    }
  };

  const deleteAd = async (id: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this ad?")) return;

    try {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;

      // Try to delete image from storage
      const path = imageUrl.split("/ads/")[1];
      if (path) {
        await supabase.storage.from("ads").remove([path]);
      }

      toast.success("Ad deleted successfully");
      fetchAds();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete ad");
    }
  };

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Ad Management</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Ad
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Ad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ad title"
                />
              </div>
              <div>
                <Label htmlFor="linkUrl">Link URL (Optional)</Label>
                <Input
                  id="linkUrl"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="image">Ad Image</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
              <Button onClick={handleCreateAd} disabled={uploading} className="w-full">
                {uploading ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Create Ad"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No ads created yet
              </TableCell>
            </TableRow>
          ) : (
            ads.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell>
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-20 h-12 object-cover rounded"
                  />
                </TableCell>
                <TableCell>{ad.title}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {ad.link_url || "-"}
                </TableCell>
                <TableCell>{ad.display_order}</TableCell>
                <TableCell>
                  <Switch
                    checked={ad.is_active}
                    onCheckedChange={() => toggleAdStatus(ad.id, ad.is_active)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAd(ad.id, ad.image_url)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};
