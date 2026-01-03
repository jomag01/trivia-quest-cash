import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, User, Image as ImageIcon, Play } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Review {
  id: string;
  buyer_id: string;
  product_rating: number;
  seller_rating: number | null;
  review_text: string | null;
  media_urls: string[] | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

interface ProductReviewsProps {
  productId: string;
  sellerId?: string | null;
}

export const ProductReviews = ({ productId, sellerId }: ProductReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [productRating, setProductRating] = useState(0);
  const [sellerRating, setSellerRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from("product_reviews")
      .select(`
        *,
        profiles!product_reviews_buyer_id_fkey(full_name, email)
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReviews(data as any);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }

    if (productRating === 0) {
      toast.error("Please rate the product");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("product_reviews").insert({
        buyer_id: user.id,
        product_id: productId,
        seller_id: sellerId,
        product_rating: productRating,
        seller_rating: sellerId ? sellerRating : null,
        review_text: reviewText.trim() || null,
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      setShowReviewForm(false);
      setProductRating(0);
      setSellerRating(0);
      setReviewText("");
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.product_rating, 0) / reviews.length
      : 0;

  const StarRating = ({ rating, onRate, readonly = false }: any) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onRate(star)}
          disabled={readonly}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Customer Reviews</h3>
          <div className="flex items-center gap-2 mt-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="font-bold text-lg">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        </div>
        {user && (
          <Button
            onClick={() => setShowReviewForm(!showReviewForm)}
            variant="outline"
          >
            Write a Review
          </Button>
        )}
      </div>

      {showReviewForm && (
        <Card className="p-4 border-2 border-primary/20 bg-primary/5">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Product Rating
              </label>
              <StarRating rating={productRating} onRate={setProductRating} />
            </div>

            {sellerId && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Seller Rating
                </label>
                <StarRating rating={sellerRating} onRate={setSellerRating} />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">
                Your Review (Optional)
              </label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmitReview} disabled={loading}>
                Submit Review
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowReviewForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id} className="p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">
                      {review.profiles?.full_name || review.profiles?.email || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <StarRating rating={review.product_rating} readonly />
                  {review.review_text && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {review.review_text}
                    </p>
                  )}
                  
                  {/* Review Media */}
                  {review.media_urls && review.media_urls.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {review.media_urls.map((url, index) => {
                        const isVideo = url.includes('video') || url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedMedia(url)}
                            className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                          >
                            {isVideo ? (
                              <>
                                <video src={url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Play className="w-6 h-6 text-white fill-white" />
                                </div>
                              </>
                            ) : (
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Media Preview Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {selectedMedia && (
            selectedMedia.includes('video') || selectedMedia.includes('.mp4') || selectedMedia.includes('.mov') || selectedMedia.includes('.webm') ? (
              <video 
                src={selectedMedia} 
                controls 
                autoPlay 
                className="w-full max-h-[80vh] object-contain"
              />
            ) : (
              <img 
                src={selectedMedia} 
                alt="Review media" 
                className="w-full max-h-[80vh] object-contain"
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
