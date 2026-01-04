import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart, RefreshCw, ChevronRight, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { emitCartUpdated } from "@/lib/cartEvents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import SellerChat from "@/components/shop/SellerChat";

interface Product {
  id: string;
  name: string;
  description?: string;
  base_price: number;
  promo_price?: number;
  promo_active?: boolean;
  image_url?: string;
  diamond_reward?: number;
  category_id?: string;
  seller_id?: string;
  seller_name?: string;
}

interface AIProductRecommendationsProps {
  currentProductId?: string;
  browsingHistory?: string[];
  onProductClick?: (product: Product) => void;
}

export default function AIProductRecommendations({ 
  currentProductId, 
  browsingHistory = [],
  onProductClick 
}: AIProductRecommendationsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiReason, setAiReason] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const hasFetched = useRef(false);
  const browsingHistoryRef = useRef(browsingHistory);

  // Update ref when browsingHistory changes
  useEffect(() => {
    browsingHistoryRef.current = browsingHistory;
  }, [browsingHistory]);

  const fetchRecommendations = useCallback(async (isManualRefresh = false) => {
    // Prevent duplicate fetches on mount
    if (!isManualRefresh && hasFetched.current) return;
    hasFetched.current = true;
    
    // Only show loading state on initial fetch, not refreshes
    if (!isManualRefresh) {
      setLoading(true);
    }
    setHasError(false);
    
    try {
      // Fetch all active products with image_url and seller info
      const { data: allProducts, error } = await supabase
        .from("products")
        .select("id, name, description, base_price, promo_price, promo_active, image_url, diamond_reward, category_id, stock_quantity, seller_id, profiles:seller_id(full_name)")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .limit(50);

      if (error) throw error;

      // Filter products that have valid images and map seller names
      const productsWithImages = (allProducts || []).filter(p => p.image_url && p.image_url.length > 0).map(p => ({
        ...p,
        seller_name: (p as any).profiles?.full_name || "Seller"
      }));

      if (productsWithImages.length === 0) {
        // Fallback: get any products even without images
        const { data: fallbackProducts } = await supabase
          .from("products")
          .select("id, name, description, base_price, promo_price, promo_active, image_url, diamond_reward, category_id, stock_quantity")
          .eq("is_active", true)
          .limit(50);
        
        const shuffled = (fallbackProducts || [])
          .filter(p => p.id !== currentProductId)
          .sort(() => Math.random() - 0.5)
          .slice(0, 8);
        
        setRecommendations(shuffled);
        setAiReason("Products for you");
        setLoading(false);
        return;
      }

      // Get random products with images
      const recommendedProducts = productsWithImages
        .filter(p => p.id !== currentProductId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);
      
      setRecommendations(recommendedProducts);
      setAiReason("Recommended for you");
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setHasError(true);
      setRecommendations([]);
      setAiReason("Unable to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [currentProductId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);
  const getAIRecommendations = async (
    products: Product[],
    currentId?: string,
    history: string[] = []
  ): Promise<{ products: Product[]; reason: string }> => {
    try {
      // Get current product details if viewing one
      const currentProduct = currentId 
        ? products.find(p => p.id === currentId)
        : null;

      // Get recently viewed products
      const viewedProducts = history
        .slice(0, 5)
        .map(id => products.find(p => p.id === id))
        .filter(Boolean) as Product[];

      // Build context for AI
      const productList = products
        .filter(p => p.id !== currentId && !history.includes(p.id))
        .slice(0, 20)
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description?.slice(0, 100) || "",
          price: p.base_price,
          category: (p as any).product_categories?.name || "General"
        }));

      const context = {
        currentProduct: currentProduct ? {
          name: currentProduct.name,
          description: currentProduct.description?.slice(0, 100),
          category: (currentProduct as any).product_categories?.name
        } : null,
        recentlyViewed: viewedProducts.map(p => ({
          name: p.name,
          category: (p as any).product_categories?.name
        })),
        availableProducts: productList
      };

      // Call AI for recommendations
      const { data, error } = await supabase.functions.invoke("ai-generate", {
        body: {
          type: "product-recommendations",
          context: JSON.stringify(context)
        }
      });

      if (error) throw error;

      // Parse AI response
      const recommendedIds = data.recommendations || [];
      const reason = data.reason || "Recommended for you";

      // Map back to full product objects
      const recommendedProducts = recommendedIds
        .map((id: string) => products.find(p => p.id === id))
        .filter(Boolean)
        .slice(0, 4) as Product[];

      // If AI didn't return enough, fill with similar category products
      if (recommendedProducts.length < 4 && currentProduct) {
        const sameCategoryProducts = products
          .filter(p => 
            p.id !== currentId && 
            p.category_id === currentProduct.category_id &&
            !recommendedProducts.some(rp => rp.id === p.id)
          )
          .slice(0, 4 - recommendedProducts.length);
        recommendedProducts.push(...sameCategoryProducts);
      }

      // Still not enough? Add random products
      if (recommendedProducts.length < 4) {
        const randomProducts = products
          .filter(p => 
            p.id !== currentId && 
            !recommendedProducts.some(rp => rp.id === p.id)
          )
          .sort(() => Math.random() - 0.5)
          .slice(0, 4 - recommendedProducts.length);
        recommendedProducts.push(...randomProducts);
      }

      return { products: recommendedProducts, reason };
    } catch (error) {
      console.error("AI recommendation error:", error);
      // Fallback logic
      const fallbackProducts = products
        .filter(p => p.id !== currentId)
        .sort(() => Math.random() - 0.5)
        .slice(0, 4);
      return { 
        products: fallbackProducts, 
        reason: "Trending products you might like" 
      };
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations();
    setRefreshing(false);
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

      emitCartUpdated();
      toast.success("Added to cart!");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  if (loading) {
    return (
      <Card className="p-2 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-[4/5] rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <Card className="p-2 bg-gradient-to-r from-amber-500/10 via-background to-orange-500/10 border-amber-500/20 overflow-hidden">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">🐝</span>
          <span className="text-xs font-semibold">
            <span className="text-amber-600">Bee</span> AI Picks
          </span>
          <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4 bg-amber-500/20 text-amber-600">Beta</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{aiReason}</p>

      {/* Products Grid - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {recommendations.slice(0, 4).map((product) => (
          <div
            key={product.id}
            className="group overflow-hidden rounded-lg border border-border/50 bg-card cursor-pointer hover:shadow-sm transition-all"
            onClick={() => onProductClick?.(product)}
          >
            <div className="aspect-square relative bg-secondary">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                  <ShoppingCart className="w-4 h-4" />
                </div>
              )}

              {/* AI Badge - Smaller */}
              <Badge className="absolute top-0.5 left-0.5 bg-primary/90 text-[8px] px-1 py-0 h-4 gap-0.5">
                <Sparkles className="w-2 h-2" />
                AI Pick
              </Badge>

              {/* Promo Badge */}
              {product.promo_active && product.promo_price && (
                <Badge className="absolute top-0.5 right-0.5 bg-destructive text-[8px] px-1 py-0 h-4">
                  -{Math.round(((product.base_price - product.promo_price) / product.base_price) * 100)}%
                </Badge>
              )}
            </div>

            <div className="p-1.5">
              <p className="text-[10px] font-medium line-clamp-1">{product.name}</p>
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-0.5">
                  {product.promo_active && product.promo_price ? (
                    <>
                      <span className="text-destructive font-bold text-xs">₱{product.promo_price.toLocaleString()}</span>
                      <span className="text-muted-foreground text-[8px] line-through">₱{product.base_price}</span>
                    </>
                  ) : (
                    <span className="text-foreground font-bold text-xs">₱{product.base_price.toLocaleString()}</span>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-5 w-5 rounded-full"
                  onClick={(e) => addToCart(product.id, e)}
                >
                  <ShoppingCart className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* See More - Compact */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-1.5 text-[10px] h-6 text-muted-foreground hover:text-primary"
        onClick={handleRefresh}
      >
        Show different picks
        <ChevronRight className="w-3 h-3 ml-0.5" />
      </Button>
    </Card>
  );
}
