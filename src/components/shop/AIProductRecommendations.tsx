import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart, Heart, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    fetchRecommendations();
  }, [currentProductId, browsingHistory]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Fetch all active products
      const { data: allProducts, error } = await supabase
        .from("products")
        .select("*, product_categories(name)")
        .eq("is_active", true)
        .limit(50);

      if (error) throw error;

      // Fetch user's browsing history from interactions if logged in
      let userInteractions: string[] = [];
      if (user) {
        const { data: interactions } = await supabase
          .from("user_interactions")
          .select("target_id, target_type, interaction_type")
          .eq("user_id", user.id)
          .eq("target_type", "product")
          .order("created_at", { ascending: false })
          .limit(20);

        userInteractions = interactions?.map(i => i.target_id) || [];
      }

      // Combine with passed browsing history
      const combinedHistory = [...new Set([...browsingHistory, ...userInteractions])];

      // Get AI recommendations
      const aiRecommendations = await getAIRecommendations(
        allProducts || [],
        currentProductId,
        combinedHistory
      );

      setRecommendations(aiRecommendations.products);
      setAiReason(aiRecommendations.reason);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      // Fallback to random products
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .neq("id", currentProductId || "")
        .limit(4);
      setRecommendations(data || []);
      setAiReason("Popular products you might like");
    } finally {
      setLoading(false);
    }
  };

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
      toast.success("Added to cart!");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <Card className="p-4 bg-gradient-to-r from-primary/5 via-background to-accent/5 border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-1">
              AI Picks For You
              <Badge variant="secondary" className="text-[10px] ml-1">Beta</Badge>
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{aiReason}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-2">
        {recommendations.map((product) => (
          <Card
            key={product.id}
            className="group overflow-hidden border-border/50 cursor-pointer hover:shadow-md transition-all"
            onClick={() => onProductClick?.(product)}
          >
            <div className="aspect-square relative bg-secondary">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              )}

              {/* AI Badge */}
              <Badge className="absolute top-1 left-1 bg-primary/90 text-[9px] gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AI Pick
              </Badge>

              {/* Promo Badge */}
              {product.promo_active && product.promo_price && (
                <Badge className="absolute top-1 right-1 bg-destructive text-[9px]">
                  -{Math.round(((product.base_price - product.promo_price) / product.base_price) * 100)}%
                </Badge>
              )}
            </div>

            <div className="p-2">
              <p className="text-xs font-medium line-clamp-1">{product.name}</p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  {product.promo_active && product.promo_price ? (
                    <>
                      <span className="text-destructive font-bold text-sm">₱{product.promo_price.toLocaleString()}</span>
                      <span className="text-muted-foreground text-[10px] line-through">₱{product.base_price}</span>
                    </>
                  ) : (
                    <span className="text-accent font-bold text-sm">₱{product.base_price.toLocaleString()}</span>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-6 w-6 rounded-full"
                  onClick={(e) => addToCart(product.id, e)}
                >
                  <ShoppingCart className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* See More */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-3 text-xs text-muted-foreground hover:text-primary"
        onClick={handleRefresh}
      >
        Show different recommendations
        <ChevronRight className="w-3 h-3 ml-1" />
      </Button>
    </Card>
  );
}
