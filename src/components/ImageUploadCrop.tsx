import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Upload, Crop as CropIcon, X } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";

interface ImageUploadCropProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string;
  maxSizeKB?: number;
}

export const ImageUploadCrop = ({ onImageUploaded, currentImage, maxSizeKB = 500 }: ImageUploadCropProps) => {
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  const fileOrBlobToDataUrl = (file: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: maxSizeKB / 1024,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      fileType: 'image/jpeg' as const,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed from ${(file.size / 1024).toFixed(2)}KB to ${(compressedFile.size / 1024).toFixed(2)}KB`);
      return compressedFile;
    } catch (error) {
      console.error("Compression failed:", error);
      return file;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: false,
  });

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!imgRef.current || !completedCrop) return null;

    const canvas = document.createElement("canvas");
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.9
      );
    });
  };

  const handleCropComplete = async () => {
    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg();
      
      if (!croppedBlob) {
        toast.error("Failed to crop image");
        return;
      }

      // Convert blob to file for compression
      const croppedFile = new File([croppedBlob], originalFile?.name || "cropped.jpg", {
        type: "image/jpeg",
      });

      // Compress the cropped image
      const compressedFile = await compressImage(croppedFile);
      toast.success(`Image optimized to ${(compressedFile.size / 1024).toFixed(0)}KB`);

      // Upload to Supabase Storage
      const fileExt = "jpg";
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await uploadToStorage("product-images", filePath, compressedFile);

      if (uploadError) {
        // Fallback: store as data URL in DB fields
        const dataUrl = await fileOrBlobToDataUrl(compressedFile);
        onImageUploaded(dataUrl);
        setCropDialogOpen(false);
        setImageSrc("");
        toast.warning("Storage offline. Used temporary in-DB image.");
        return;
      }

      // Use public URL from upload result
      const publicUrl = uploadData?.publicUrl || "";

      onImageUploaded(publicUrl);
      setCropDialogOpen(false);
      setImageSrc("");
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSkipCrop = async () => {
    if (!originalFile) return;

    try {
      setUploading(true);
      const compressedFile = await compressImage(originalFile);
      toast.success(`Image optimized to ${(compressedFile.size / 1024).toFixed(0)}KB`);

      // Upload to Supabase Storage
      const fileExt = compressedFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await uploadToStorage("product-images", filePath, compressedFile);

      if (uploadError) {
        // Fallback: store as data URL in DB fields
        const dataUrl = await fileOrBlobToDataUrl(compressedFile);
        onImageUploaded(dataUrl);
        setCropDialogOpen(false);
        setImageSrc("");
        toast.warning("Storage offline. Used temporary in-DB image.");
        return;
      }

      // Use public URL from upload result
      const publicUrl = uploadData?.publicUrl || "";

      onImageUploaded(publicUrl);
      setCropDialogOpen(false);
      setImageSrc("");
      toast.success("Image uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <Label>Product Image</Label>
        
        {/* Drag and Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-sm text-primary">Drop the image here...</p>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop an image here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Images will be compressed and optimized automatically (max {maxSizeKB}KB)
              </p>
            </div>
          )}
        </div>

        {/* Current Image Preview */}
        {currentImage && (
          <div className="relative">
            <Label className="mb-2 block">Current Image</Label>
            <div className="relative inline-block">
              <img
                src={currentImage}
                alt="Current product"
                className="w-32 h-32 object-cover rounded border"
              />
            </div>
          </div>
        )}
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={setCropDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crop & Optimize Image</DialogTitle>
            <DialogDescription>
              Adjust the crop area or skip to upload the full image. Image will be automatically compressed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {imageSrc && (
              <div className="max-h-[60vh] overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop preview"
                    className="max-w-full"
                  />
                </ReactCrop>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setCropDialogOpen(false);
                  setImageSrc("");
                }}
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleSkipCrop}
                disabled={uploading}
              >
                Skip Crop
              </Button>
              <Button
                onClick={handleCropComplete}
                disabled={uploading || !completedCrop}
              >
                <CropIcon className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Crop & Upload"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
