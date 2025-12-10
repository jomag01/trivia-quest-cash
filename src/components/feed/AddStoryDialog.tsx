import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded?: () => void;
}

export default function AddStoryDialog({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please select an image or video file");
      return;
    }

    // Compress images
    let processedFile = file;
    if (file.type.startsWith("image/")) {
      try {
        processedFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1080,
          useWebWorker: true
        });
      } catch (err) {
        console.error("Compression failed:", err);
      }
    }

    setSelectedFile(processedFile);
    setPreview(URL.createObjectURL(processedFile));
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("stories")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: selectedFile.type.startsWith("video/") ? "video" : "image"
        });

      if (insertError) throw insertError;

      toast.success("Story added!");
      onStoryAdded?.();
      handleClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload story");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Story</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary transition-colors"
            >
              <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Click to select an image or video</p>
              <p className="text-xs text-muted-foreground mt-1">Stories expire after 24 hours</p>
            </div>
          ) : (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-background/80"
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              {selectedFile?.type.startsWith("video/") ? (
                <video src={preview} className="w-full rounded-xl max-h-80 object-cover" controls />
              ) : (
                <img src={preview} alt="Preview" className="w-full rounded-xl max-h-80 object-cover" />
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {preview && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Share Story
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}