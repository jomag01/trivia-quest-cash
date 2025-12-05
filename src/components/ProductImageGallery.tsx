import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, getPublicUrl, deleteFromStorage } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Star, Upload, X, Image } from "lucide-react";
import imageCompression from 'browser-image-compression';

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductImageGalleryProps {
  productId: string;
  onPrimaryImageChange?: (imageUrl: string) => void;
}

export const ProductImageGallery = ({ productId, onPrimaryImageChange }: ProductImageGalleryProps) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (productId) {
      fetchImages();
    }
  }, [productId]);

  const fetchImages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true });

    if (!error && data) {
      setImages(data);
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadPromises = Array.from(files).map(async (file, index) => {
        // Compress image
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });

        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/products/${productId}/${Date.now()}_${index}.${fileExt}`;

        // Try uploading to ads bucket
        const { error: uploadError } = await uploadToStorage("ads", fileName, compressedFile);

        if (uploadError) {
          // If storage fails, convert to base64
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(compressedFile);
          });
        }

        return getPublicUrl("ads", fileName);
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      // Insert into product_images table
      const newImages = uploadedUrls.map((url, index) => ({
        product_id: productId,
        image_url: url,
        is_primary: images.length === 0 && index === 0,
        display_order: images.length + index,
      }));

      const { error: insertError } = await supabase
        .from("product_images")
        .insert(newImages);

      if (insertError) throw insertError;

      toast.success(`${files.length} image(s) uploaded successfully!`);
      fetchImages();

      // Update primary image in products table if this is the first image
      if (images.length === 0 && uploadedUrls.length > 0) {
        await supabase
          .from("products")
          .update({ image_url: uploadedUrls[0] })
          .eq("id", productId);
        
        onPrimaryImageChange?.(uploadedUrls[0]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload images");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const setPrimaryImage = async (imageId: string, imageUrl: string) => {
    try {
      // Remove primary from all images
      await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);

      // Set new primary
      await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", imageId);

      // Update products table
      await supabase
        .from("products")
        .update({ image_url: imageUrl })
        .eq("id", productId);

      toast.success("Primary image updated");
      fetchImages();
      onPrimaryImageChange?.(imageUrl);
    } catch (error: any) {
      toast.error("Failed to set primary image");
    }
  };

  const deleteImage = async (image: ProductImage) => {
    if (!confirm("Delete this image?")) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from("product_images")
        .delete()
        .eq("id", image.id);

      if (error) throw error;

      // Try to delete from storage if it's a storage URL
      if (image.image_url.includes("/ads/")) {
        const path = image.image_url.split("/ads/")[1];
        if (path) {
          await deleteFromStorage("ads", [path]);
        }
      }

      // If this was the primary image, set another as primary
      if (image.is_primary) {
        const remainingImages = images.filter(img => img.id !== image.id);
        if (remainingImages.length > 0) {
          await setPrimaryImage(remainingImages[0].id, remainingImages[0].image_url);
        } else {
          await supabase
            .from("products")
            .update({ image_url: null })
            .eq("id", productId);
          onPrimaryImageChange?.("");
        }
      }

      toast.success("Image deleted");
      fetchImages();
    } catch (error: any) {
      toast.error("Failed to delete image");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Upload className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Image className="w-4 h-4" />
          Product Gallery ({images.length} images)
        </h4>
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <Button size="sm" disabled={uploading}>
            {uploading ? (
              <Upload className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add Images
          </Button>
        </div>
      </div>

      {images.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <Image className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No images uploaded yet. Add images to showcase your product.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
                image.is_primary ? "border-primary" : "border-transparent"
              }`}
            >
              <img
                src={image.image_url}
                alt="Product"
                className="w-full h-full object-cover"
              />
              
              {image.is_primary && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Main
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.is_primary && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="w-8 h-8"
                    onClick={() => setPrimaryImage(image.id, image.image_url)}
                    title="Set as primary"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="destructive"
                  className="w-8 h-8"
                  onClick={() => deleteImage(image)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Click the star icon to set an image as primary. The primary image will be displayed first.
      </p>
    </div>
  );
};
