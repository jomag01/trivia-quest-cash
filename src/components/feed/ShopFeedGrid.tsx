import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Heart, Play, Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  base_price: number;
  promo_price?: number;
  promo_active?: boolean;
  image_url?: string;
  diamond_reward?: number;
  rating?: number;
  sold_count?: number;
  boosted_sales_count?: number;
  boosted_rating?: number;
  review_count?: number;
  real_sales?: number;
}

interface ShopFeedGridProps {
  limit?: number;
}

export default function ShopFeedGrid({ limit = 8 }: ShopFeedGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashSaleEnds, setFlashSaleEnds] = useState<Date>(new Date(Date.now() + 3600000 * 4));
  const [timeLeft, setTimeLeft] = useState("");
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProducts();
    
    // Countdown timer
    const timer = setInterval(() => {
      const diff = flashSaleEnds.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [flashSaleEnds]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, base_price, promo_price, promo_active, image_url, diamond_reward, boosted_sales_count, boosted_rating")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (data) {
      // Fetch real sales count and ratings for each product
      const productIds = data.map(p => p.id);
      
      // Get real sales from delivered orders
      const { data: salesData } = await supabase
        .from("order_items")
        .select("product_id, quantity, orders!inner(status)")
        .in("product_id", productIds)
        .eq("orders.status", "delivered");
      
      // Get real reviews/ratings
      const { data: reviewsData } = await supabase
        .from("product_reviews")
        .select("product_id, product_rating")
        .in("product_id", productIds);
      
      // Aggregate sales per product
      const salesMap: Record<string, number> = {};
      salesData?.forEach(item => {
        salesMap[item.product_id] = (salesMap[item.product_id] || 0) + item.quantity;
      });
      
      // Aggregate ratings per product
      const ratingsMap: Record<string, { sum: number; count: number }> = {};
      reviewsData?.forEach(review => {
        if (!ratingsMap[review.product_id]) {
          ratingsMap[review.product_id] = { sum: 0, count: 0 };
        }
        ratingsMap[review.product_id].sum += review.product_rating;
        ratingsMap[review.product_id].count += 1;
      });
      
      // Combine boosted + real data
      const enrichedProducts = data.map(product => {
        const realSales = salesMap[product.id] || 0;
        const boostedSales = Number(product.boosted_sales_count) || 0;
        const totalSales = boostedSales + realSales;
        
        const ratingData = ratingsMap[product.id];
        const realAvgRating = ratingData ? ratingData.sum / ratingData.count : 0;
        const realReviewCount = ratingData?.count || 0;
        const boostedRating = Number(product.boosted_rating) || 0;
        
        // Use boosted rating if no real reviews, otherwise blend or use real
        const displayRating = realReviewCount > 0 
          ? (boostedRating > 0 ? (boostedRating + realAvgRating) / 2 : realAvgRating)
          : (boostedRating > 0 ? boostedRating : 4.8);
        
        return {
          ...product,
          sold_count: totalSales,
          rating: displayRating,
          review_count: realReviewCount,
          real_sales: realSales
        };
      });
      
      setProducts(enrichedProducts);
    }
    setLoading(false);
  };

  const addToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please sign in to add to cart");
      navigate("/auth");
      return;
    }

    try {
      const { data: existing } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        await supabase.from("cart").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      } else {
        await supabase.from("cart").insert({ user_id: user.id, product_id: productId, quantity: 1 });
      }
      toast.success("Added to cart!");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newWishlist = new Set(wishlist);
    if (newWishlist.has(productId)) {
      newWishlist.delete(productId);
    } else {
      newWishlist.add(productId);
    }
    setWishlist(newWishlist);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const promoProducts = products.filter(p => p.promo_active);
  const regularProducts = products.filter(p => !p.promo_active);

  return (
    <div className="space-y-4 pb-4">
      {/* Flash Sale Banner */}
      {promoProducts.length > 0 && (
        <div className="mx-4 p-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" />
              <span className="font-bold">Flash Sale</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{timeLeft}</span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {promoProducts.map(product => (
              <Card
                key={product.id}
                className="min-w-[140px] overflow-hidden border-0 bg-white cursor-pointer"
                onClick={() => navigate(`/shop?product=${product.id}`)}
              >
                <div className="aspect-square relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <Badge className="absolute top-1 left-1 bg-destructive text-[10px]">
                    -{Math.round(((product.base_price - (product.promo_price || 0)) / product.base_price) * 100)}%
                  </Badge>
                </div>
                <div className="p-2">
                  <p className="text-xs text-foreground line-clamp-1">{product.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-destructive font-bold text-sm">₱{product.promo_price}</span>
                    <span className="text-muted-foreground text-xs line-through">₱{product.base_price}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {regularProducts.map(product => (
          <Card
            key={product.id}
            className="group overflow-hidden border-border/50 cursor-pointer"
            onClick={() => navigate(`/shop?product=${product.id}`)}
          >
            <div className="aspect-square relative bg-secondary">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ShoppingCart className="w-8 h-8" />
                </div>
              )}
              
              {/* Wishlist button */}
              <button
                onClick={(e) => toggleWishlist(product.id, e)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center"
              >
                <Heart className={`w-4 h-4 ${wishlist.has(product.id) ? 'fill-destructive text-destructive' : ''}`} />
              </button>

              {/* Diamond reward */}
              {product.diamond_reward && product.diamond_reward > 0 && (
                <Badge className="absolute top-2 left-2 bg-primary text-[10px]">
                  💎 {product.diamond_reward}
                </Badge>
              )}
            </div>

            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2 mb-1">{product.name}</p>
              
              <div className="flex items-center gap-1 mb-2">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">
                  {(product.rating || 4.8).toFixed(1)}
                  {product.review_count && product.review_count > 0 && (
                    <span className="ml-0.5">({product.review_count})</span>
                  )}
                  {" · "}
                  {(product.sold_count || 0).toLocaleString()} sold
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-accent font-bold">₱{product.base_price.toLocaleString()}</span>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full"
                  onClick={(e) => addToCart(product.id, e)}
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* View all button */}
      <div className="px-4">
        <Button 
          variant="outline" 
          className="w-full rounded-full"
          onClick={() => navigate("/shop")}
        >
          View All Products
        </Button>
      </div>
    </div>
  );
}
