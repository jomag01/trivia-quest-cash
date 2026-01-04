import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import LazadaProductCard from "@/components/shop/LazadaProductCard";

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
      <div className="space-y-2 p-2">
        <div className="h-16 bg-muted rounded-lg animate-pulse" />
        <div className="grid grid-cols-3 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-[3/4] bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const promoProducts = products.filter(p => p.promo_active);
  const regularProducts = products.filter(p => !p.promo_active);

  return (
    <div className="space-y-2 pb-4">
      {/* Flash Sale Banner - Compact */}
      {promoProducts.length > 0 && (
        <div className="mx-2 p-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <Flame className="w-4 h-4" />
              <span className="font-bold text-xs">Flash Sale</span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
              <Clock className="w-3 h-3" />
              <span className="font-mono font-bold text-[10px]">{timeLeft}</span>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {promoProducts.map(product => (
              <div
                key={product.id}
                className="min-w-[90px] max-w-[90px] overflow-hidden rounded-md bg-white cursor-pointer"
                onClick={() => navigate(`/shop?product=${product.id}`)}
              >
                <div className="aspect-square relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <Badge className="absolute top-0.5 left-0.5 bg-destructive text-[7px] px-1 py-0 h-3">
                    -{Math.round(((product.base_price - (product.promo_price || 0)) / product.base_price) * 100)}%
                  </Badge>
                </div>
                <div className="p-1">
                  <p className="text-[8px] text-foreground line-clamp-1">{product.name}</p>
                  <span className="text-destructive font-bold text-[10px]">₱{product.promo_price?.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid - Lazada style 3 columns */}
      <div className="grid grid-cols-3 gap-1.5 px-2">
        {regularProducts.map(product => (
          <LazadaProductCard
            key={product.id}
            product={product}
            inWishlist={wishlist.has(product.id)}
            onProductClick={() => navigate(`/shop?product=${product.id}`)}
            onAddToCart={(id, e) => addToCart(id, e)}
            onToggleWishlist={(id, e) => toggleWishlist(id, e)}
          />
        ))}
      </div>

      {/* View all button - Compact */}
      <div className="px-2">
        <Button 
          variant="outline" 
          size="sm"
          className="w-full rounded-full h-8 text-xs"
          onClick={() => navigate("/?tab=shop")}
        >
          View All Products
        </Button>
      </div>
    </div>
  );
}
