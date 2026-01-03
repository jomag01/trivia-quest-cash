import { useState, useRef, useEffect } from "react";
import { X, Image, MapPin, Globe, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

interface XPostComposerProps {
  mode: "text" | "image" | "video";
  onClose: () => void;
  onPostCreated: () => void;
}

export default function XPostComposer({ mode, onClose, onPostCreated }: XPostComposerProps) {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_CHARS = 280;
  const charsLeft = MAX_CHARS - content.length;

  useEffect(() => {
    textareaRef.current?.focus();
    // Auto-open file picker for image/video mode
    if (mode === "image" || mode === "video") {
      setTimeout(() => fileInputRef.current?.click(), 300);
    }
  }, [mode]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxFiles = 4;
    const filesToAdd = files.slice(0, maxFiles - mediaFiles.length);

    for (const file of filesToAdd) {
      // Validate file size
      const maxSize = file.type.startsWith("video") ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large. Max ${file.type.startsWith("video") ? "100MB" : "10MB"}`);
        continue;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setMediaPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
      setMediaFiles(prev => [...prev, file]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      let fileToUpload = file;

      // Compress images
      if (file.type.startsWith("image/")) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.85,
        };
        fileToUpload = await imageCompression(file, options);
      }

      const fileExt = fileToUpload.name.split(".").pop() || "jpg";
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("post-media")
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Media upload failed:", error);
      return null;
    }
  };

  const handlePost = async () => {
    if (!user) {
      toast.error("Please log in to post");
      return;
    }

    if (!content.trim() && mediaFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }

    setIsPosting(true);
    setUploadProgress(0);

    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Upload media if any
      if (mediaFiles.length > 0) {
        setUploadProgress(10);
        const file = mediaFiles[0]; // For now, single media
        
        mediaUrl = await uploadMedia(file);
        
        if (!mediaUrl) {
          throw new Error("Failed to upload media");
        }

        mediaType = file.type.startsWith("video") ? "video" : 
                    file.type.startsWith("audio") ? "audio" : "image";
        
        setUploadProgress(70);
      }

      // Create post
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      toast.success("Posted!");
      onPostCreated();
    } catch (error: any) {
      console.error("Post error:", error);
      toast.error(error.message || "Failed to post");
    } finally {
      setIsPosting(false);
      setUploadProgress(0);
    }
  };

  const canPost = content.trim().length > 0 || mediaFiles.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <Button
          onClick={handlePost}
          disabled={!canPost || isPosting}
          className="bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold px-5 rounded-full disabled:opacity-50"
        >
          {isPosting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Post"
          )}
        </Button>
      </div>

      {/* Composer Body */}
      <div className="flex p-4 gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-zinc-700 text-white">
            {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="What's happening?"
            className="w-full bg-transparent text-white text-xl placeholder:text-zinc-500 resize-none outline-none min-h-[120px]"
            maxLength={MAX_CHARS}
          />

          {/* Media Previews */}
          {mediaPreviews.length > 0 && (
            <div className={`grid gap-2 mt-3 ${mediaPreviews.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {mediaPreviews.map((preview, index) => (
                <div key={index} className="relative rounded-2xl overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMedia(index)}
                    className="absolute top-2 right-2 z-10 bg-black/70 hover:bg-black/90 text-white rounded-full h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  {mediaFiles[index]?.type.startsWith("video") ? (
                    <video
                      src={preview}
                      className="w-full max-h-[300px] object-cover rounded-2xl"
                      controls
                    />
                  ) : (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full max-h-[300px] object-cover rounded-2xl"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reply Settings */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <button className="flex items-center gap-2 text-[#1d9bf0] text-sm font-medium">
          <Globe className="w-4 h-4" />
          Everyone can reply
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Upload Progress */}
      {isPosting && uploadProgress > 0 && (
        <div className="px-4 py-2">
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#1d9bf0] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 px-4 py-3 flex items-center justify-between bg-black">
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={mode === "video" ? "video/*" : "image/*"}
            onChange={handleFileSelect}
            className="hidden"
            multiple={mode === "image"}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-2 rounded-full transition-colors"
            disabled={mediaFiles.length >= 4}
          >
            <Image className="w-5 h-5" />
          </button>
          <button className="text-[#1d9bf0] hover:bg-[#1d9bf0]/10 p-2 rounded-full transition-colors">
            <MapPin className="w-5 h-5" />
          </button>
        </div>

        {/* Character Counter */}
        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <>
              <div className="relative h-6 w-6">
                <svg className="h-6 w-6 -rotate-90">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke={charsLeft < 0 ? "#f91880" : charsLeft < 20 ? "#ffd400" : "#2f3336"}
                    strokeWidth="2"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke={charsLeft < 0 ? "#f91880" : charsLeft < 20 ? "#ffd400" : "#1d9bf0"}
                    strokeWidth="2"
                    strokeDasharray={`${Math.min(100, (content.length / MAX_CHARS) * 100) * 0.628} 100`}
                  />
                </svg>
              </div>
              {charsLeft < 20 && (
                <span className={`text-sm ${charsLeft < 0 ? "text-pink-500" : "text-yellow-500"}`}>
                  {charsLeft}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}