import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileImage, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage, getPublicUrl } from "@/lib/storage";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import imageCompression from "browser-image-compression";

interface FileUploadProps {
  onFileUploaded: (url: string, fileName: string, fileSize: number, fileType: string) => void;
}

export const FileUpload = ({ onFileUploaded }: FileUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size limits
    const isImage = file.type.startsWith("image/");
    const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB for images, 10MB for files

    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${isImage ? "5MB" : "10MB"}`);
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      let fileToUpload = selectedFile;

      // Compress images
      if (selectedFile.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(selectedFile, options);
      }

      // Upload to Supabase Storage
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error } = await uploadToStorage("message-attachments", fileName, fileToUpload);
      if (error) throw error;

      // Get public URL
      const publicUrl = getPublicUrl("message-attachments", fileName);

      onFileUploaded(
        publicUrl,
        selectedFile.name,
        fileToUpload.size,
        fileToUpload.type
      );

      // Reset
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("File uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
      />
      
      {selectedFile ? (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-popover border rounded-lg shadow-lg w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">Selected File</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={handleCancel}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-32 object-cover rounded mb-2"
            />
          ) : (
            <div className="flex items-center gap-2 p-4 bg-muted rounded mb-2">
              <File className="w-8 h-8 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}
          
          <Button
            onClick={handleUpload}
            disabled={uploading}
            size="sm"
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload & Send"}
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => fileInputRef.current?.click()}
      >
        <Paperclip className="w-5 h-5" />
      </Button>
    </div>
  );
};
