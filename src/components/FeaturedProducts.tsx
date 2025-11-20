import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductShareButton } from "@/components/ProductShareButton";

interface FeaturedProduct {
  id: string;
  name: string;
  description: string;
  base_price: number;
  promo_price: number | null;
  promo_active: boolean;
  image_url: string | null;
  stock_quantity: number;
  diamond_reward: number;
  [key: string]: any;
}

export const FeaturedProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    setLoading(true);
    try {
      const supabaseClient: any = supabase;
      const response = await supabaseClient
        .from("products")
        .select("id, name, description, base_price, promo_price, promo_active, image_url, stock_quantity, diamond_reward")
        .eq("is_featured", true)
        .eq("is_active", true)
        .limit(10)
        .order("created_at", { ascending: false });

      if (response.error) throw response.error;
      
      // Fetch static and hover images for products
      const productsWithImages = await Promise.all(
        (response.data || []).map(async (product: FeaturedProduct) => {
          const { data: images } = await supabase
            .from("product_images")
            .select("image_url, image_type")
            .eq("product_id", product.id)
            .in("image_type", ["static", "hover"]);
          
          const staticImage = images?.find(img => img.image_type === "static")?.image_url || product.image_url;
          const hoverImage = images?.find(img => img.image_type === "hover")?.image_url;
          
          return { 
            ...product, 
            image_url: staticImage,
            hover_image_url: hoverImage
          };
        })
      );
      
      setProducts(productsWithImages);
    } catch (error) {
      console.error("Error fetching featured products:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast.error("Please login to add items to cart");
      window.location.href = "/auth";
      return;
    }

    try {
      const { data: existingItem } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart")
          .insert([{ user_id: user.id, product_id: productId, quantity: 1 }]);

        if (error) throw error;
      }

      toast.success("Added to cart!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const getEffectivePrice = (product: FeaturedProduct) => {
    if (product.promo_active && product.promo_price) {
      return product.promo_price;
    }
    return product.base_price;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Featured Products</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="p-3">
              <Skeleton className="w-full aspect-square mb-2 rounded" />
              <Skeleton className="h-4 w-3/4 mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-primary fill-primary" />
        <h2 className="text-xl font-bold">Featured Products</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
        {products.map((product) => {
          const effectivePrice = getEffectivePrice(product);
          const hasDiscount = product.promo_active && product.promo_price;

          return (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group border-border/50">
              <div className="relative aspect-square bg-muted overflow-hidden">
                {product.image_url ? (
                  <>
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        product.hover_image_url ? 'group-hover:opacity-0' : 'group-hover:scale-105'
                      }`}
                      loading="lazy"
                    />
                    {product.hover_image_url && (
                      <img
                        src={product.hover_image_url}
                        alt={`${product.name} hover`}
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        loading="lazy"
                      />
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
                {hasDiscount && (
                  <Badge className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 bg-red-500 text-white">
                    Sale
                  </Badge>
                )}
                {product.diamond_reward > 0 && (
                  <Badge className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 bg-primary">
                    💎 {product.diamond_reward}
                  </Badge>
                )}
              </div>
              
              <div className="p-2 space-y-1.5">
                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 leading-tight">{product.name}</h3>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-sm md:text-base font-bold text-primary">
                    ₱{effectivePrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] md:text-xs text-muted-foreground line-through">
                      ₱{product.base_price.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <Button
                    size="sm"
                    className="h-7 text-[10px] md:text-xs"
                    onClick={() => addToCart(product.id)}
                    disabled={product.stock_quantity === 0}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    {product.stock_quantity === 0 ? "Out" : "Add"}
                  </Button>
                  <ProductShareButton
                    productId={product.id}
                    productName={product.name}
                    size="sm"
                    className="h-7 text-[10px] md:text-xs"
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
