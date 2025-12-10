import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, Image } from "lucide-react";
import imageCompression from "browser-image-compression";

export default function AppLogoManagement() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCurrentLogo();
  }, []);

  const loadCurrentLogo = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_logo")
      .single();

    if (data?.value) {
      setLogoUrl(data.value);
    }
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setUploading(true);
    try {
      // Compress image
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 512,
        useWebWorker: true
      });

      const fileExt = file.name.split(".").pop();
      const fileName = `app-logo.${fileExt}`;

      // Upload to ads bucket (reuse existing bucket)
      const { error: uploadError } = await supabase.storage
        .from("ads")
        .upload(fileName, compressed, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ads")
        .getPublicUrl(fileName);

      const newUrl = `${publicUrl}?t=${Date.now()}`;

      // Update app_settings
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ value: newUrl, updated_at: new Date().toISOString() })
        .eq("key", "app_logo");

      if (updateError) throw updateError;

      setLogoUrl(newUrl);
      toast.success("App logo updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to update logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: null, updated_at: new Date().toISOString() })
        .eq("key", "app_logo");

      if (error) throw error;

      setLogoUrl(null);
      toast.success("Logo removed");
    } catch (error: any) {
      toast.error("Failed to remove logo");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Image className="w-5 h-5" />
        App Logo
      </h3>

      <div className="space-y-4">
        {logoUrl ? (
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="App Logo" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Change Logo
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveLogo}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
          >
            <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Click to upload app logo</p>
            <p className="text-xs text-muted-foreground mt-1">Recommended: 512x512 PNG</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </Card>
  );
}