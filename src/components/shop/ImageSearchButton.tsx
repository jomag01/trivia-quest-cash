import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MatchedProduct {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  image_url?: string;
}

interface ImageSearchButtonProps {
  onSearchResults: (query: string, imageUrl?: string) => void;
  onProductSelect?: (product: MatchedProduct) => void;
}

export const ImageSearchButton = ({ onSearchResults, onProductSelect }: ImageSearchButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [showResults, setShowResults] = useState(false);
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
      setMatchedProducts([]);
      setShowResults(false);
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
    setMatchedProducts([]);
    try {
      const { data, error } = await supabase.functions.invoke("image-search", {
        body: { imageDataUrl: selectedImage },
      });

      if (error) throw error;

      const keywords = (data as any)?.keywords?.trim?.() || "";
      const products = (data as any)?.matchedProducts || [];

      if (products.length > 0) {
        setMatchedProducts(products);
        setShowResults(true);
        toast.success(`Found ${products.length} similar products!`);
      } else if (keywords) {
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

  const handleProductClick = useCallback((product: MatchedProduct) => {
    if (onProductSelect) {
      onProductSelect(product);
    }
    onSearchResults(product.name, selectedImage || undefined);
    setIsOpen(false);
    setSelectedImage(null);
    setMatchedProducts([]);
    setShowResults(false);
  }, [onProductSelect, onSearchResults, selectedImage]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setMatchedProducts([]);
    setShowResults(false);
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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {showResults ? "Similar Products Found" : "Search by Image"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {showResults && matchedProducts.length > 0 ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {/* Show analyzed image */}
                  {selectedImage && (
                    <div className="relative mb-4">
                      <img
                        src={selectedImage}
                        alt="Searched product"
                        className="w-full h-32 object-contain rounded-lg bg-muted"
                      />
                      <Badge className="absolute top-2 left-2 text-[10px]">
                        Your Image
                      </Badge>
                    </div>
                  )}
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    Tap a product to view details:
                  </p>
                  
                  {matchedProducts.map((product) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleProductClick(product)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <p className="text-sm font-bold text-primary mt-1">
                            ₱{product.base_price.toFixed(2)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={clearImage}
                >
                  Search Another Image
                </Button>
              </ScrollArea>
            ) : (
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
                        Finding Similar Products...
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 mr-2" />
                        Find Similar Products
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  AI will analyze the image and find matching products in our shop
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
