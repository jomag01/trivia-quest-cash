import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageSearchButtonProps {
  onSearchResults: (query: string, imageUrl?: string) => void;
}

export const ImageSearchButton = ({ onSearchResults }: ImageSearchButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCameraCapture = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  }, []);

  const handleGallerySelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  }, []);

  const analyzeImage = useCallback(async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("image-search", {
        body: { imageDataUrl: selectedImage },
      });

      if (error) throw error;

      const keywords = (data as any)?.keywords?.trim?.() || "";

      if (keywords) {
        onSearchResults(keywords, selectedImage);
        setIsOpen(false);
        setSelectedImage(null);
        toast.success(`Searching for: ${keywords}`);
      } else {
        toast.error("Could not identify the product. Please try another image.");
      }
    } catch (error: any) {
      console.error("Image analysis error:", error);
      const status = error?.status;
      if (status === 429) toast.error("Too many requests. Please try again.");
      else if (status === 402) toast.error("Image search is temporarily unavailable.");
      else toast.error("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedImage, onSearchResults]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-10 w-10"
        onClick={() => setIsOpen(true)}
      >
        <Camera className="h-5 w-5 text-primary" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search by Image</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedImage ? (
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected product"
                  className="w-full h-48 object-contain rounded-lg bg-muted"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={handleCameraCapture}
                >
                  <Camera className="h-8 w-8" />
                  <span className="text-sm">Take Photo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={handleGallerySelect}
                >
                  <div className="grid grid-cols-2 gap-0.5 h-8 w-8">
                    <div className="bg-primary/30 rounded-tl" />
                    <div className="bg-primary/50 rounded-tr" />
                    <div className="bg-primary/40 rounded-bl" />
                    <div className="bg-primary/60 rounded-br" />
                  </div>
                  <span className="text-sm">Gallery</span>
                </Button>
              </div>
            )}

            {selectedImage && (
              <Button
                className="w-full"
                onClick={analyzeImage}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Search Similar Products
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Take a photo or upload an image to find similar products
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
