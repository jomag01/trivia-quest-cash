import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { uploadToStorage } from "@/lib/storage";

interface ProfileImageUploadProps {
  size?: "sm" | "md" | "lg";
  showEditButton?: boolean;
}

export default function ProfileImageUpload({ size = "md", showEditButton = true }: ProfileImageUploadProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-16 w-16",
    lg: "h-24 w-24"
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      // Compress image aggressively for avatar (small size needed)
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.1, // 100KB max for avatars
        maxWidthOrHeight: 256, // Small avatar size
        useWebWorker: true,
        fileType: 'image/jpeg' // Force JPEG for smaller size
      });

      const fileExt = file.name.split(".").pop();
      const fileName = `avatar.${fileExt}`;

      // Use Edge Function workaround for storage upload
      const { data: uploadData, error: uploadError } = await uploadToStorage(
        "avatars", 
        user.id, 
        compressed, 
        { fileName }
      );

      if (uploadError || !uploadData?.publicUrl) {
        throw new Error("Failed to upload image");
      }

      const publicUrl = uploadData.publicUrl;

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile picture updated!");
      setOpen(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to update profile picture");
    } finally {
      setUploading(false);
    }
  };

  const avatarUrl = profile?.avatar_url;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative cursor-pointer group">
          <Avatar className={`${sizeClasses[size]} ring-2 ring-border`}>
            <AvatarImage src={avatarUrl || ""} />
            <AvatarFallback className="bg-secondary text-lg">
              {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {showEditButton && (
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage src={avatarUrl || ""} />
              <AvatarFallback className="text-4xl bg-secondary">
                {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
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
                <Camera className="w-4 h-4 mr-2" />
                Choose Photo
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}