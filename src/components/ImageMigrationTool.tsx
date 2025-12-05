import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { toast } from "sonner";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export const ImageMigrationTool = () => {
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{
    total: number;
    migrated: number;
    failed: number;
    skipped: number;
  }>({ total: 0, migrated: 0, failed: 0, skipped: 0 });

  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const migrateImage = async (imageUrl: string, productId: string, imageId: string, isProductTable: boolean) => {
    try {
      // Convert data URL to blob
      const blob = dataUrlToBlob(imageUrl);
      
      // Create file from blob
      const file = new File([blob], `migrated-${imageId}.jpg`, { type: 'image/jpeg' });

      // Upload to storage
      const fileName = `${Math.random()}.jpg`;
      const { data: uploadData, error: uploadError } = await uploadToStorage("product-images", fileName, file);
      if (uploadError) throw uploadError;

      // Get public URL from upload result
      const publicUrl = uploadData?.publicUrl || "";

      // Update database
      if (isProductTable) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ image_url: publicUrl })
          .eq("id", productId);
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await supabase
          .from("product_images")
          .update({ image_url: publicUrl })
          .eq("id", imageId);
        if (updateError) throw updateError;
      }

      return { success: true };
    } catch (error) {
      console.error("Migration error:", error);
      return { success: false, error };
    }
  };

  const startMigration = async () => {
    setMigrating(true);
    setProgress(0);
    setResults({ total: 0, migrated: 0, failed: 0, skipped: 0 });

    try {
      // Fetch all products with base64 images
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, image_url")
        .like("image_url", "data:%");

      if (productsError) throw productsError;

      // Fetch all product_images with base64 images
      const { data: productImages, error: imagesError } = await supabase
        .from("product_images")
        .select("id, product_id, image_url")
        .like("image_url", "data:%");

      if (imagesError) throw imagesError;

      const totalImages = (products?.length || 0) + (productImages?.length || 0);
      setResults(prev => ({ ...prev, total: totalImages }));

      if (totalImages === 0) {
        toast.info("No base64 images found to migrate");
        setMigrating(false);
        return;
      }

      let processed = 0;

      // Migrate product main images
      for (const product of products || []) {
        if (product.image_url) {
          const result = await migrateImage(product.image_url, product.id, product.id, true);
          if (result.success) {
            setResults(prev => ({ ...prev, migrated: prev.migrated + 1 }));
          } else {
            setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        }
        processed++;
        setProgress((processed / totalImages) * 100);
      }

      // Migrate product_images
      for (const image of productImages || []) {
        if (image.image_url) {
          const result = await migrateImage(image.image_url, image.product_id, image.id, false);
          if (result.success) {
            setResults(prev => ({ ...prev, migrated: prev.migrated + 1 }));
          } else {
            setResults(prev => ({ ...prev, failed: prev.failed + 1 }));
          }
        }
        processed++;
        setProgress((processed / totalImages) * 100);
      }

      toast.success(`Migration complete! ${results.migrated} images migrated successfully.`);
    } catch (error: any) {
      console.error("Migration failed:", error);
      toast.error(`Migration failed: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Image Migration Tool</h2>
        <p className="text-muted-foreground">
          Migrate base64 product images to storage bucket. This tool will find all products with 
          base64/data URL images and upload them to the storage bucket.
        </p>
      </div>

      {results.total > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold">{results.total}</div>
            </Card>
            <Card className="p-4 border-green-500">
              <div className="text-sm text-muted-foreground">Migrated</div>
              <div className="text-2xl font-bold text-green-600">{results.migrated}</div>
            </Card>
            <Card className="p-4 border-red-500">
              <div className="text-sm text-muted-foreground">Failed</div>
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
            </Card>
            <Card className="p-4 border-yellow-500">
              <div className="text-sm text-muted-foreground">Skipped</div>
              <div className="text-2xl font-bold text-yellow-600">{results.skipped}</div>
            </Card>
          </div>

          {migrating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Migration progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          onClick={startMigration}
          disabled={migrating}
          size="lg"
          className="flex-1"
        >
          {migrating ? (
            <>
              <AlertCircle className="w-5 h-5 mr-2 animate-spin" />
              Migrating Images...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Start Migration
            </>
          )}
        </Button>
      </div>

      {results.migrated > 0 && !migrating && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">
            Successfully migrated {results.migrated} out of {results.total} images
            {results.failed > 0 && ` (${results.failed} failed)`}
          </span>
        </div>
      )}
    </Card>
  );
};
