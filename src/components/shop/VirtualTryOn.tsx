import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Sparkles, Download, RefreshCw, User, X, RotateCcw, ChevronLeft, ChevronRight, Play, Pause, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

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

type ViewAngle = 'front' | 'back' | 'left' | 'right';

interface GeneratedImages {
  front?: string;
  back?: string;
  left?: string;
  right?: string;
}

export const VirtualTryOn = ({ product, open, onOpenChange }: VirtualTryOnProps) => {
  const { user } = useAuth();
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImages>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingAngles, setGeneratingAngles] = useState<ViewAngle[]>([]);
  const [activeTab, setActiveTab] = useState<"model" | "upload">("model");
  const [currentAngle, setCurrentAngle] = useState<ViewAngle>('front');
  const [isSpinning, setIsSpinning] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'spin'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const angleOrder: ViewAngle[] = ['front', 'right', 'back', 'left'];
  const angleLabels: Record<ViewAngle, string> = {
    front: 'Front View',
    back: 'Back View',
    left: 'Left Side',
    right: 'Right Side'
  };

  // Auto-spin effect
  useEffect(() => {
    if (isSpinning && Object.keys(generatedImages).length >= 2) {
      spinIntervalRef.current = setInterval(() => {
        setCurrentAngle(prev => {
          const currentIndex = angleOrder.indexOf(prev);
          const nextIndex = (currentIndex + 1) % angleOrder.length;
          // Skip angles that don't have images
          let attempts = 0;
          let next = angleOrder[nextIndex];
          while (!generatedImages[next] && attempts < 4) {
            const idx = (angleOrder.indexOf(next) + 1) % angleOrder.length;
            next = angleOrder[idx];
            attempts++;
          }
          return next;
        });
      }, 800);
    } else {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    }
    return () => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, [isSpinning, generatedImages]);

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        setGeneratedImages({});
        setUserPhoto(null);
        setIsGenerating(false);
        setGeneratingAngles([]);
        setCurrentAngle('front');
        setIsSpinning(false);
        setViewMode('single');
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
      setGeneratedImages({});
    };
    reader.readAsDataURL(file);
  };

  const generateSingleAngle = async (angle: ViewAngle): Promise<string | null> => {
    if (!product.image_url) return null;

    const angleDescriptions: Record<ViewAngle, string> = {
      front: 'from the front, facing the camera directly',
      back: 'from behind, showing the back view',
      left: 'from the left side, profile view showing the left side',
      right: 'from the right side, profile view showing the right side'
    };

    const prompt = activeTab === "model"
      ? `Generate a professional fashion photograph showing a model wearing this clothing item "${product.name}" ${angleDescriptions[angle]}. 
         The model should be in a clean studio setting with good lighting.
         Show the full outfit clearly from this specific angle: ${angle.toUpperCase()} VIEW.
         Make it look like a professional fashion catalog photo.
         The pose should naturally show this angle of the clothing.`
      : `Take this person's photo and show them wearing this clothing item: "${product.name}" ${angleDescriptions[angle]}.
         Keep the person's face and body proportions similar, but show them from this angle: ${angle.toUpperCase()} VIEW.
         The person should be posed to show the ${angle} view of the outfit.
         Make it look natural and realistic as if viewed from the ${angle}.`;

    try {
      const { data, error } = await supabase.functions.invoke('virtual-try-on', {
        body: {
          productImageUrl: product.image_url,
          userPhotoUrl: activeTab === "upload" ? userPhoto : null,
          prompt,
          productDescription: `${product.description || product.name} - ${angle} view`,
          viewAngle: angle
        }
      });

      if (error) throw error;
      return data?.imageUrl || null;
    } catch (error) {
      console.error(`Error generating ${angle} view:`, error);
      return null;
    }
  };

  const handleTryOn = async () => {
    if (!product.image_url) {
      toast.error("Product image not available");
      return;
    }

    setIsGenerating(true);
    setGeneratingAngles(['front', 'back', 'left', 'right']);
    setGeneratedImages({});
    
    try {
      // Generate all angles in parallel
      const anglesToGenerate: ViewAngle[] = ['front', 'back', 'left', 'right'];
      
      toast.info("Generating 4 different angle views...", { duration: 5000 });

      const results = await Promise.allSettled(
        anglesToGenerate.map(async (angle) => {
          const result = await generateSingleAngle(angle);
          // Update as each completes
          if (result) {
            setGeneratedImages(prev => ({ ...prev, [angle]: result }));
            setGeneratingAngles(prev => prev.filter(a => a !== angle));
          }
          return { angle, result };
        })
      );

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.result
      ).length;

      if (successCount > 0) {
        toast.success(`Generated ${successCount} view${successCount > 1 ? 's' : ''}!`);
        setCurrentAngle('front');
      } else {
        throw new Error("Failed to generate any images");
      }
    } catch (error: any) {
      console.error("Virtual try-on error:", error);
      toast.error(error.message || "Failed to generate try-on images");
    } finally {
      setIsGenerating(false);
      setGeneratingAngles([]);
    }
  };

  const handleDownload = () => {
    const currentImage = generatedImages[currentAngle];
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `try-on-${product.name.replace(/\s+/g, '-')}-${currentAngle}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded!");
  };

  const handleDownloadAll = () => {
    Object.entries(generatedImages).forEach(([angle, url]) => {
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `try-on-${product.name.replace(/\s+/g, '-')}-${angle}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
    toast.success("All images downloaded!");
  };

  const resetTryOn = () => {
    setGeneratedImages({});
    setUserPhoto(null);
    setCurrentAngle('front');
    setIsSpinning(false);
    setViewMode('single');
  };

  const navigateAngle = (direction: 'prev' | 'next') => {
    const availableAngles = angleOrder.filter(a => generatedImages[a]);
    if (availableAngles.length === 0) return;
    
    const currentIndex = availableAngles.indexOf(currentAngle);
    let newIndex: number;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % availableAngles.length;
    } else {
      newIndex = (currentIndex - 1 + availableAngles.length) % availableAngles.length;
    }
    
    setCurrentAngle(availableAngles[newIndex]);
  };

  const toggleSpin = () => {
    setIsSpinning(!isSpinning);
    setViewMode('spin');
  };

  const hasMultipleImages = Object.keys(generatedImages).length > 1;
  const hasAnyImage = Object.keys(generatedImages).length > 0;

  const renderImageViewer = () => {
    if (isGenerating || generatingAngles.length > 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
          <RefreshCw className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground text-center">
            Generating {4 - generatingAngles.length}/4 views...
          </p>
          <div className="flex gap-2 mt-2">
            {angleOrder.map(angle => (
              <div
                key={angle}
                className={`w-3 h-3 rounded-full transition-colors ${
                  generatedImages[angle] 
                    ? 'bg-primary' 
                    : generatingAngles.includes(angle) 
                      ? 'bg-primary/30 animate-pulse' 
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      );
    }

    if (!hasAnyImage) {
      return (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm text-center p-4">
          {activeTab === "upload" && !userPhoto 
            ? "Upload a photo first" 
            : "Click Generate to create 360° views"}
        </div>
      );
    }

    const currentImage = generatedImages[currentAngle];

    return (
      <div className="relative w-full h-full">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentAngle}
            src={currentImage || generatedImages.front}
            alt={`Try-on ${currentAngle} view`}
            className="w-full h-full object-cover"
            initial={{ opacity: 0, rotateY: -30 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 30 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>
        
        {/* Angle indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full">
          <p className="text-white text-xs font-medium">{angleLabels[currentAngle]}</p>
        </div>

        {/* Navigation arrows */}
        {hasMultipleImages && !isSpinning && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-8 w-8"
              onClick={() => navigateAngle('prev')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white h-8 w-8"
              onClick={() => navigateAngle('next')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderAngleThumbnails = () => {
    if (!hasAnyImage) return null;

    return (
      <div className="flex gap-2 justify-center mt-3">
        {angleOrder.map(angle => {
          const image = generatedImages[angle];
          const isGeneratingThis = generatingAngles.includes(angle);
          
          return (
            <button
              key={angle}
              onClick={() => {
                setCurrentAngle(angle);
                setIsSpinning(false);
              }}
              disabled={!image && !isGeneratingThis}
              className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden transition-all ${
                currentAngle === angle 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : image 
                    ? 'border-border hover:border-primary/50' 
                    : 'border-dashed border-muted-foreground/30 opacity-50'
              }`}
            >
              {image ? (
                <img src={image} alt={angle} className="w-full h-full object-cover" />
              ) : isGeneratingThis ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5 capitalize">
                {angle}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            360° Virtual Try-On: {product.name}
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
                AI will generate 4 different angle views showing this item on a model
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
                <p className="text-sm font-medium text-center">360° View</p>
                <div className="aspect-square rounded-lg border overflow-hidden bg-muted/30">
                  {renderImageViewer()}
                </div>
              </div>
            </div>

            {renderAngleThumbnails()}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card className="p-4 bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Upload your photo and see 360° views of how this item looks on you!
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
                          setGeneratedImages({});
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
                <p className="text-sm font-medium text-center">360° View</p>
                <div className="aspect-square rounded-lg border overflow-hidden bg-muted/30">
                  {renderImageViewer()}
                </div>
              </div>
            </div>

            {renderAngleThumbnails()}

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
                <p className="text-xs text-muted-foreground">Will be applied to your photo from 4 angles</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 360° Spin Control */}
        {hasMultipleImages && (
          <div className="flex justify-center gap-2 mt-2">
            <Button
              variant={isSpinning ? "default" : "outline"}
              size="sm"
              onClick={toggleSpin}
              className="gap-2"
            >
              {isSpinning ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Spin
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  360° Spin View
                </>
              )}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {hasAnyImage ? (
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
                variant="outline"
                onClick={handleDownload}
                disabled={!generatedImages[currentAngle]}
              >
                <Download className="w-4 h-4 mr-2" />
                Save Current
              </Button>
              {hasMultipleImages && (
                <Button 
                  onClick={handleDownloadAll}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Save All
                </Button>
              )}
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
                  Generating 360° Views...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate 360° Try-On
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Powered by AI • Generates front, back, left & right views
        </p>
      </DialogContent>
    </Dialog>
  );
};
