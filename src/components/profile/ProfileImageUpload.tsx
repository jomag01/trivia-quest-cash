import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import { 
  validateImage, 
  uploadProfileImage, 
  UploadProgress 
} from "@/lib/imageUpload";

interface ProfileImageUploadProps {
  size?: "sm" | "md" | "lg";
  showEditButton?: boolean;
}

export default function ProfileImageUpload({ size = "md", showEditButton = true }: ProfileImageUploadProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
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

    // Validate file
    const validation = validateImage(file, 'profile');
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      toast.error(validation.error);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress({ progress: 0, status: 'uploading', message: 'Starting...' });

    try {
      const result = await uploadProfileImage(file, user.id, setUploadProgress);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: result.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast.success("Profile picture updated!");
      setOpen(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || 'Upload failed. Tap to retry.');
      toast.error(error.message || "Failed to update profile picture");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 2000);
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
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploadProgress && (
            <div className="space-y-2">
              <Progress value={uploadProgress.progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {uploadProgress.message}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={() => {
              setError(null);
              fileInputRef.current?.click();
            }}
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
                {error ? 'Retry Upload' : 'Choose Photo'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Supported: JPEG, PNG, WebP (max 2MB)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}