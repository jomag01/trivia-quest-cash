import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Image, Video, Music, X, Upload, Users, Radio, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { uploadToAWS, validateFile, getFileSizeLimits } from "@/lib/awsMedia";
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

    if (!selectedFile || !mediaType) {
      toast.error("Please select media to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparing upload...");

    try {
      let mediaUrl = "";
      let fileToUpload = selectedFile;

      // Compress images for optimal feed performance
      if (mediaType === "image") {
        setUploadStatus("Compressing image...");
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
          initialQuality: 0.85,
        };
        fileToUpload = await imageCompression(selectedFile, options);
        setUploadProgress(10);
      }

      setUploadStatus("Uploading to AWS S3...");

      // Upload to AWS S3/CloudFront for fast global delivery
      const awsResult = await uploadToAWS(
        fileToUpload, 
        `posts/${user.id}`,
        (progress) => {
          // Map progress to 10-90% range (compression takes 0-10%, DB insert takes 90-100%)
          const mappedProgress = 10 + Math.round(progress.percentage * 0.8);
          setUploadProgress(mappedProgress);
          setUploadStatus(`Uploading... ${progress.percentage}%`);
        }
      );
      
      if (awsResult?.cdnUrl) {
        mediaUrl = awsResult.cdnUrl;
        console.log("Uploaded to AWS CDN:", mediaUrl);
        setUploadStatus("Upload complete!");
      } else {
        // Fallback to Supabase Storage
        setUploadStatus("Falling back to backup storage...");
        console.log("AWS upload failed, falling back to Supabase Storage");
        try {
          const fileExt = fileToUpload.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await uploadToStorage("post-media", fileName, fileToUpload);
          if (uploadError) throw uploadError;

          mediaUrl = uploadData?.publicUrl || "";
        } catch (storageError) {
          console.warn("Storage upload failed, using data URL fallback:", storageError);
          mediaUrl = previewUrl || "";
        }
      }

      setUploadProgress(95);
      setUploadStatus("Saving post...");

      // Create post in database
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content || null,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      setUploadProgress(100);
      setUploadStatus("Post created!");

      toast.success("Post created successfully!");
      
      // Reset form after short delay to show completion
      setTimeout(() => {
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
      }, 500);
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
              disabled={uploading || !selectedFile}
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
