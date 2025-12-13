import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Sparkles, Download, RefreshCw, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface VirtualTryOnProps {
  product: {
    id: string;
    name: string;
    image_url?: string;
    description?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VirtualTryOn = ({ product, open, onOpenChange }: VirtualTryOnProps) => {
  const { user } = useAuth();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"model" | "upload">("model");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Small delay to prevent flickering
      setTimeout(() => {
        setGeneratedImage(null);
        setUserPhoto(null);
        setIsGenerating(false);
      }, 100);
    }
    onOpenChange(isOpen);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUserPhoto(reader.result as string);
      setGeneratedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleTryOn = async () => {
    if (!product.image_url) {
      toast.error("Product image not available");
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = activeTab === "model"
        ? `Show this clothing item "${product.name}" being worn by a professional fashion model. The model should be standing in a clean studio setting with good lighting. Show the full outfit clearly. Make it look like a professional fashion catalog photo.`
        : `Take this person's photo and show them wearing this clothing item: "${product.name}". Keep the person's face and body proportions exactly the same, only change their outfit to show them wearing this item. Make it look natural and realistic.`;

      const { data, error } = await supabase.functions.invoke('virtual-try-on', {
        body: {
          productImageUrl: product.image_url,
          userPhotoUrl: activeTab === "upload" ? userPhoto : null,
          prompt,
          productDescription: product.description || product.name
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success("Try-on image generated!");
      } else {
        throw new Error("No image returned");
      }
    } catch (error: any) {
      console.error("Virtual try-on error:", error);
      toast.error(error.message || "Failed to generate try-on image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `try-on-${product.name.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const resetTryOn = () => {
    setGeneratedImage(null);
    setUserPhoto(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Virtual Try-On: {product.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "model" | "upload")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="model" className="gap-2">
              <User className="w-4 h-4" />
              See on Model
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Camera className="w-4 h-4" />
              Try on Yourself
            </TabsTrigger>
          </TabsList>

          <TabsContent value="model" className="space-y-4">
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                AI will generate an image of this item being worn by a professional model
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Product</p>
                <div className="aspect-square rounded-lg border overflow-hidden bg-white">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Result</p>
                <div className="aspect-square rounded-lg border overflow-hidden bg-muted/30">
                  {isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Generating...</p>
                    </div>
                  ) : generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Try-on result"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm text-center p-4">
                      Click "Generate" to see this item on a model
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Upload your photo and see how this item looks on you!
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Your Photo</p>
                <div 
                  className="aspect-square rounded-lg border-2 border-dashed overflow-hidden bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {userPhoto ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={userPhoto} 
                        alt="Your photo"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserPhoto(null);
                          setGeneratedImage(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Click to upload your photo
                      </p>
                      <p className="text-xs text-muted-foreground">Max 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-center">Result</p>
                <div className="aspect-square rounded-lg border overflow-hidden bg-muted/30">
                  {isGenerating ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Generating...</p>
                    </div>
                  ) : generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Try-on result"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm text-center p-4">
                      {userPhoto ? "Click Generate to try on" : "Upload a photo first"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Product reference */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-16 h-16 rounded border overflow-hidden flex-shrink-0">
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground">Will be applied to your photo</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {generatedImage ? (
            <>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={resetTryOn}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button 
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </>
          ) : (
            <Button 
              className="w-full"
              onClick={handleTryOn}
              disabled={isGenerating || (activeTab === "upload" && !userPhoto)}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Try-On
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by AI • Results may vary
        </p>
      </DialogContent>
    </Dialog>
  );
};
