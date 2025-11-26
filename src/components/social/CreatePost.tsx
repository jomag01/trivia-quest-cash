import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Image, Video, Music, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import imageCompression from "browser-image-compression";

export const CreatePost = ({ onPostCreated }: { onPostCreated: () => void }) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio" | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: "image" | "video" | "audio") => {
    setMediaType(type);
    const input = fileInputRef.current;
    if (!input) return;

    if (type === "image") {
      input.accept = "image/*";
    } else if (type === "video") {
      input.accept = "video/*";
    } else if (type === "audio") {
      input.accept = "audio/*";
    }
    input.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size limits
    const maxSize = mediaType === "image" ? 10 * 1024 * 1024 : 100 * 1024 * 1024; // 10MB for images, 100MB for videos/audio
    if (file.size > maxSize) {
      toast.error(`File too large. Max size: ${mediaType === "image" ? "10MB" : "100MB"}`);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!user) {
      toast.error("Please log in to create a post");
      return;
    }

    if (!selectedFile || !mediaType) {
      toast.error("Please select media to upload");
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = selectedFile;

      // Compress images
      if (mediaType === "image") {
        const options = {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(selectedFile, options);
      }

      // Upload to Supabase Storage
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(fileName, fileToUpload);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(fileName);

      // Create post in database
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content || null,
          media_url: urlData.publicUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      toast.success("Post created successfully!");
      
      // Reset form
      setContent("");
      setSelectedFile(null);
      setMediaType(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      onPostCreated();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setMediaType(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[100px]"
        />

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        {previewUrl && (
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={clearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
            {mediaType === "image" && (
              <img src={previewUrl} alt="Preview" className="w-full rounded-lg max-h-96 object-cover" />
            )}
            {mediaType === "video" && (
              <video src={previewUrl} controls className="w-full rounded-lg max-h-96" />
            )}
            {mediaType === "audio" && (
              <audio src={previewUrl} controls className="w-full" />
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFileSelect("image")}
            disabled={uploading || !!selectedFile}
          >
            <Image className="w-4 h-4 mr-2" />
            Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFileSelect("video")}
            disabled={uploading || !!selectedFile}
          >
            <Video className="w-4 h-4 mr-2" />
            Video
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFileSelect("audio")}
            disabled={uploading || !!selectedFile}
          >
            <Music className="w-4 h-4 mr-2" />
            Audio
          </Button>
        </div>

        <Button
          onClick={handlePost}
          disabled={uploading || !selectedFile}
          className="w-full"
        >
          {uploading ? (
            <>
              <Upload className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Post"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
