import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, deleteFromStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Edit2, GripVertical, Image } from "lucide-react";

interface PromoSlide {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  display_order: number;
  is_active: boolean;
}

export const HomePageManagement = () => {
  const [slides, setSlides] = useState<PromoSlide[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<PromoSlide | null>(null);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSlides();
  }, []);

  const fetchSlides = async () => {
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("display_order", { ascending: true });

    if (!error && data) {
      setSlides(data);
    }
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

  const resetForm = () => {
    setTitle("");
    setLinkUrl("");
    setDisplayOrder(slides.length);
    setImageFile(null);
    setImagePreview(null);
    setEditingSlide(null);
  };

  const handleOpenDialog = (slide?: PromoSlide) => {
    if (slide) {
      setEditingSlide(slide);
      setTitle(slide.title);
      setLinkUrl(slide.link_url || "");
      setDisplayOrder(slide.display_order);
      setImagePreview(slide.image_url);
    } else {
      resetForm();
      setDisplayOrder(slides.length);
    }
    setDialogOpen(true);
  };

  const handleSaveSlide = async () => {
    if (!title || (!imageFile && !editingSlide)) {
      toast.error("Please provide title and image");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = editingSlide?.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `promo/${user.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await uploadToStorage("ads", fileName, imageFile);
        if (uploadError) throw uploadError;

        imageUrl = uploadData?.publicUrl || "";
      }

      if (editingSlide) {
        const { error: updateError } = await supabase
          .from("ads")
          .update({
            title,
            image_url: imageUrl,
            link_url: linkUrl || null,
            display_order: displayOrder,
          })
          .eq("id", editingSlide.id);

        if (updateError) throw updateError;
        toast.success("Slide updated successfully!");
      } else {
        const { error: insertError } = await supabase.from("ads").insert({
          title,
          image_url: imageUrl,
          link_url: linkUrl || null,
          display_order: displayOrder,
          is_active: true,
        });

        if (insertError) throw insertError;
        toast.success("Slide created successfully!");
      }

      setDialogOpen(false);
      resetForm();
      fetchSlides();
    } catch (error: any) {
      toast.error(error.message || "Failed to save slide");
    } finally {
      setUploading(false);
    }
  };

  const toggleSlideStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("ads")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update slide status");
    } else {
      toast.success("Slide status updated");
      fetchSlides();
    }
  };

  const deleteSlide = async (id: string, imageUrl: string) => {
    if (!confirm("Are you sure you want to delete this slide?")) return;

    try {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;

      const path = imageUrl.split("/ads/")[1];
      if (path) {
        await deleteFromStorage("ads", [path]);
      }

      toast.success("Slide deleted successfully");
      fetchSlides();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete slide");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            Homepage Promo Slider
          </CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Slide
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Manage promotional slides displayed on the homepage. Images are shown in a rotating carousel.
          </p>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No slides created yet. Add your first promotional slide!
                    </TableCell>
                  </TableRow>
                ) : (
                  slides.map((slide) => (
                    <TableRow key={slide.id}>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                          {slide.display_order}
                        </div>
                      </TableCell>
                      <TableCell>
                        <img
                          src={slide.image_url}
                          alt={slide.title}
                          className="w-24 h-14 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{slide.title}</TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {slide.link_url || "No link"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={slide.is_active}
                          onCheckedChange={() => toggleSlideStatus(slide.id, slide.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(slide)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteSlide(slide.id, slide.image_url)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlide ? "Edit" : "Add"} Promo Slide</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Slide title/caption"
              />
            </div>
            <div>
              <Label htmlFor="linkUrl">Link URL (Optional)</Label>
              <Input
                id="linkUrl"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://... (where to go when clicked)"
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
              <Label htmlFor="image">Slide Image {!editingSlide && "*"}</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="mt-1"
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 1200x400 pixels for best display
              </p>
            </div>
            <Button onClick={handleSaveSlide} disabled={uploading} className="w-full">
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                editingSlide ? "Update Slide" : "Create Slide"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
