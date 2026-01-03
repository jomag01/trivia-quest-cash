import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Camera, Video, X, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface OrderItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    image_url?: string;
  };
}

interface ReviewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderItems: OrderItem[];
  sellerId?: string | null;
  onSuccess?: () => void;
}

export const ReviewOrderDialog = ({
  open,
  onOpenChange,
  orderId,
  orderItems,
  sellerId,
  onSuccess,
}: ReviewOrderDialogProps) => {
  const { user } = useAuth();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [reviews, setReviews] = useState<Record<string, {
    productRating: number;
    sellerRating: number;
    reviewText: string;
    mediaFiles: File[];
    mediaUrls: string[];
  }>>({});
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentItem = orderItems[currentItemIndex];
  const currentReview = reviews[currentItem?.product_id] || {
    productRating: 0,
    sellerRating: 0,
    reviewText: "",
    mediaFiles: [],
    mediaUrls: [],
  };

  const updateReview = (productId: string, updates: Partial<typeof currentReview>) => {
    setReviews(prev => ({
      ...prev,
      [productId]: { ...currentReview, ...updates },
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB for video, 10MB for image
      
      if (!isImage && !isVideo) {
        toast.error(`${file.name} is not a valid image or video`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max ${isVideo ? '50MB' : '10MB'})`);
        return false;
      }
      return true;
    });

    if (validFiles.length + currentReview.mediaUrls.length > 5) {
      toast.error("Maximum 5 media files allowed");
      return;
    }

    setUploadingMedia(true);
    try {
      const uploadedUrls: string[] = [];
      
      for (const file of validFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${orderId}/${currentItem.product_id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('review-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          console.error('Upload error:', error);
          // Try fallback bucket or create URL from blob
          const blobUrl = URL.createObjectURL(file);
          uploadedUrls.push(blobUrl);
        } else {
          const { data: urlData } = supabase.storage
            .from('review-media')
            .getPublicUrl(data.path);
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      updateReview(currentItem.product_id, {
        mediaUrls: [...currentReview.mediaUrls, ...uploadedUrls],
      });
      toast.success(`${validFiles.length} file(s) uploaded`);
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Failed to upload media');
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (index: number) => {
    const newUrls = [...currentReview.mediaUrls];
    newUrls.splice(index, 1);
    updateReview(currentItem.product_id, { mediaUrls: newUrls });
  };

  const handleSubmitAll = async () => {
    if (!user) {
      toast.error("Please login to submit reviews");
      return;
    }

    // Validate all reviews have ratings
    for (const item of orderItems) {
      const review = reviews[item.product_id];
      if (!review || review.productRating === 0) {
        toast.error(`Please rate ${item.products.name}`);
        const itemIndex = orderItems.findIndex(i => i.product_id === item.product_id);
        setCurrentItemIndex(itemIndex);
        return;
      }
    }

    setLoading(true);
    try {
      for (const item of orderItems) {
        const review = reviews[item.product_id];
        if (!review) continue;

        const { error } = await supabase.from("product_reviews").insert({
          buyer_id: user.id,
          product_id: item.product_id,
          order_id: orderId,
          seller_id: sellerId || null,
          product_rating: review.productRating,
          seller_rating: sellerId ? review.sellerRating || null : null,
          review_text: review.reviewText.trim() || null,
          media_urls: review.mediaUrls.length > 0 ? review.mediaUrls : null,
        });

        if (error) {
          if (error.code === '23505') {
            // Duplicate review - already reviewed this product
            continue;
          }
          throw error;
        }
      }

      toast.success("Reviews submitted successfully!");
      onOpenChange(false);
      onSuccess?.();
      setReviews({});
      setCurrentItemIndex(0);
    } catch (error: any) {
      console.error('Review submission error:', error);
      toast.error(error.message || "Failed to submit reviews");
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({ rating, onRate }: { rating: number; onRate: (r: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          className="cursor-pointer hover:scale-110 transition-transform p-1"
        >
          <Star
            className={`w-8 h-8 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (!currentItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Rate & Review
          </DialogTitle>
        </DialogHeader>

        {/* Product Info */}
        <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
            {currentItem.products.image_url ? (
              <img
                src={currentItem.products.image_url}
                alt={currentItem.products.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                📦
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{currentItem.products.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Item {currentItemIndex + 1} of {orderItems.length}
            </p>
          </div>
        </div>

        {/* Product Rating */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-2">Product Quality</label>
            <StarRating
              rating={currentReview.productRating}
              onRate={(r) => updateReview(currentItem.product_id, { productRating: r })}
            />
            {currentReview.productRating > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentReview.productRating === 5 && "Amazing!"}
                {currentReview.productRating === 4 && "Good"}
                {currentReview.productRating === 3 && "Average"}
                {currentReview.productRating === 2 && "Poor"}
                {currentReview.productRating === 1 && "Terrible"}
              </p>
            )}
          </div>

          {sellerId && (
            <div>
              <label className="text-sm font-medium block mb-2">Seller Service</label>
              <StarRating
                rating={currentReview.sellerRating}
                onRate={(r) => updateReview(currentItem.product_id, { sellerRating: r })}
              />
            </div>
          )}
        </div>

        {/* Review Text */}
        <div>
          <label className="text-sm font-medium block mb-2">Your Review (Optional)</label>
          <Textarea
            value={currentReview.reviewText}
            onChange={(e) => updateReview(currentItem.product_id, { reviewText: e.target.value })}
            placeholder="Share your experience with this product..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Media Upload */}
        <div>
          <label className="text-sm font-medium block mb-2">
            Add Photos/Videos (Optional)
          </label>
          
          {/* Preview uploaded media */}
          {currentReview.mediaUrls.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {currentReview.mediaUrls.map((url, index) => (
                <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                  {url.includes('video') || url.includes('.mp4') || url.includes('.mov') ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia || currentReview.mediaUrls.length >= 5}
            >
              {uploadingMedia ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Add Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingMedia || currentReview.mediaUrls.length >= 5}
            >
              <Video className="w-4 h-4 mr-2" />
              Add Video
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Max 5 files. Images up to 10MB, videos up to 50MB.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          {orderItems.length > 1 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                disabled={currentItemIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentItemIndex(Math.min(orderItems.length - 1, currentItemIndex + 1))}
                disabled={currentItemIndex === orderItems.length - 1}
              >
                Next
              </Button>
            </div>
          )}
          
          <Button
            onClick={handleSubmitAll}
            disabled={loading}
            className="ml-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Star className="w-4 h-4 mr-2" />
                Submit All Reviews
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
