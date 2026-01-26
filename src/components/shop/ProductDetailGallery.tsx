import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

interface ProductDetailGalleryProps {
  productId: string;
  mainImageUrl?: string;
  isPod?: boolean;
  className?: string;
}

export const ProductDetailGallery = ({ 
  productId, 
  mainImageUrl, 
  isPod = false,
  className 
}: ProductDetailGalleryProps) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    fetchImages();
  }, [productId]);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        setImages(data);
      } else if (mainImageUrl) {
        // Fallback to main image if no gallery images
        setImages([{
          id: 'main',
          image_url: mainImageUrl,
          is_primary: true,
          display_order: 0,
        }]);
      }
    } catch (err) {
      console.error('Error fetching product images:', err);
      if (mainImageUrl) {
        setImages([{
          id: 'main',
          image_url: mainImageUrl,
          is_primary: true,
          display_order: 0,
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className={cn("aspect-square bg-muted animate-pulse rounded-lg", className)} />
    );
  }

  if (images.length === 0) {
    return (
      <div className={cn("aspect-square bg-muted rounded-lg flex items-center justify-center", className)}>
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  const currentImage = images[selectedIndex];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Main Image */}
      <div className="relative group">
        <div className="aspect-square overflow-hidden rounded-lg bg-muted">
          <img
            src={currentImage?.image_url}
            alt={`Product image ${selectedIndex + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* POD Badge */}
        {isPod && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2 bg-blue-500/90 text-white text-xs"
          >
            🌍 Ships Internationally
          </Badge>
        )}

        {/* Zoom Button */}
        <button
          onClick={() => setZoomOpen(true)}
          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ZoomIn className="h-4 w-4" />
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-xs">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all",
                selectedIndex === index 
                  ? "border-primary ring-1 ring-primary" 
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <img
                src={img.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Zoom Dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative">
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={currentImage?.image_url}
              alt="Product zoom view"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            
            {/* Zoom Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
