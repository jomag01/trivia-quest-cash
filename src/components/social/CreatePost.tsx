import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Image, Video, Music, X, Upload, Users, Radio, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateFile, getFileSizeLimits } from "@/lib/awsMedia";
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fileSizeLimits = getFileSizeLimits();

  const handleFileSelect = (type: "image" | "video" | "audio") => {
    setMediaType(type);
    const input = fileInputRef.current;
    if (!input) return;

    if (type === "image") {
      input.accept = "image/jpeg,image/png,image/gif,image/webp";
    } else if (type === "video") {
      input.accept = "video/mp4,video/webm,video/quicktime";
    } else if (type === "audio") {
      input.accept = "audio/mpeg,audio/wav,audio/ogg,audio/mp3";
    }
    input.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
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

    // Allow text-only posts OR posts with media
    if (!content.trim() && !selectedFile) {
      toast.error("Please add some content or media");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparing...");

    try {
      let mediaUrl: string | null = null;
      let finalMediaType: string | null = null;

      // Only process media if a file was selected
      if (selectedFile && mediaType) {
        let fileToUpload = selectedFile;

        // Fast image compression with lower quality for quick uploads
        if (mediaType === "image") {
          setUploadStatus("Optimizing...");
          const options = {
            maxSizeMB: 0.5, // Reduced for faster uploads
            maxWidthOrHeight: 1080, // Reduced for faster processing
            useWebWorker: true,
            initialQuality: 0.7, // Lower quality for speed
          };
          fileToUpload = await imageCompression(selectedFile, options);
          setUploadProgress(15);
        }

        setUploadStatus("Uploading...");

        // Use direct Supabase Storage upload
        const fileExt = fileToUpload.name.split(".").pop() || "jpg";
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(fileName, fileToUpload, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error("Failed to upload media. Please try again.");
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(uploadData.path);

        mediaUrl = urlData.publicUrl;
        setUploadProgress(85);

        if (!mediaUrl) {
          throw new Error("Failed to upload media");
        }
        
        finalMediaType = mediaType;
      }

      setUploadProgress(90);
      setUploadStatus("Saving...");

      // Create post in database (allow text-only posts)
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim() || null,
          media_url: mediaUrl,
          media_type: finalMediaType,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      setUploadStatus("Done!");

      toast.success("Post created!");
      
      // Reset form immediately
      setContent("");
      setSelectedFile(null);
      setMediaType(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setUploadStatus("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onPostCreated();
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(error.message || "Failed to create post");
      setUploadStatus("");
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setMediaType(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadStatus("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileSizeLabel = (type: "image" | "video" | "audio") => {
    const limits: Record<string, number> = {
      image: fileSizeLimits.image,
      video: fileSizeLimits.video,
      audio: fileSizeLimits.audio,
    };
    const mb = limits[type] / (1024 * 1024);
    return `Max ${mb}MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="post" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="post">Post</TabsTrigger>
            <TabsTrigger value="community">
              <Users className="w-4 h-4 mr-2" />
              Community
            </TabsTrigger>
            <TabsTrigger value="live">
              <Radio className="w-4 h-4 mr-2" />
              Go Live
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="post" className="space-y-4">
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

        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{uploadStatus}</p>
          </div>
        )}

            <Button
              onClick={handlePost}
              disabled={uploading || (!content.trim() && !selectedFile)}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  {uploadProgress}% Uploading...
                </>
              ) : uploadProgress === 100 ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Posted!
                </>
              ) : (
                "Post"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="community" className="space-y-4">
            <p className="text-muted-foreground text-center py-8">
              Share content with your community groups
            </p>
            <Button className="w-full" disabled>
              Coming Soon
            </Button>
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <p className="text-muted-foreground text-center py-8">
              Start a live video stream
            </p>
            <Button className="w-full" disabled>
              <Radio className="w-4 h-4 mr-2" />
              Start Live Video
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
