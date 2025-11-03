import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

export const WishlistView = () => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWishlist();
    }
  }, [user]);

  const fetchWishlist = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlist")
        .select("*, products(*)")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;
      fetchWishlist();
      toast.success("Removed from wishlist");
    } catch (error: any) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove item");
    }
  };

  const addToCart = async (productId: string, wishlistId: string) => {
    try {
      // Check if already in cart
      const { data: existing } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user?.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        // Update quantity
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Add new
        const { error } = await supabase.from("cart").insert({
          user_id: user?.id,
          product_id: productId,
          quantity: 1,
        });

        if (error) throw error;
      }

      // Remove from wishlist
      await removeFromWishlist(wishlistId);
      toast.success("Added to cart");
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add to cart");
    }
  };

  const getEffectivePrice = (product: any) => {
    if (!product) return 0;
    if (product.promo_active && product.promo_price) {
      return product.promo_price;
    }
    return product.base_price;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Heart className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </Card>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Your wishlist is empty</p>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {wishlistItems.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="space-y-3">
            <div>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold">{item.products?.name}</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFromWishlist(item.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.products?.description}
              </p>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">
                ₱{getEffectivePrice(item.products).toFixed(2)}
              </span>
              {item.products?.promo_active && item.products?.promo_price && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    ₱{item.products.base_price.toFixed(2)}
                  </span>
                  <Badge className="bg-red-500">
                    {item.products.discount_percentage}% OFF
                  </Badge>
                </>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => addToCart(item.product_id, item.id)}
              disabled={
                !item.products?.stock_quantity || item.products?.stock_quantity === 0
              }
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {item.products?.stock_quantity > 0 ? "Add to Cart" : "Out of Stock"}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
