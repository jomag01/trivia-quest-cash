import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface CartWidgetProps {
  onViewCart: () => void;
}

export const CartWidget = ({ onViewCart }: CartWidgetProps) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      const { data, error } = await supabase
        .from("cart")
        .select("*, products(*)")
        .eq("user_id", user?.id)
        .limit(3);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (cartId: string) => {
    try {
      const { error } = await supabase.from("cart").delete().eq("id", cartId);

      if (error) throw error;
      fetchCart();
      toast.success("Removed from cart");
    } catch (error: any) {
      console.error("Error removing from cart:", error);
      toast.error("Failed to remove item");
    }
  };

  const getEffectivePrice = (product: any) => {
    if (!product) return 0;
    if (product.promo_active && product.promo_price) {
      return product.promo_price;
    }
    return product.base_price;
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + getEffectivePrice(item.products) * item.quantity;
    }, 0);
  };

  if (loading) {
    return (
      <Card className="p-6 gradient-accent border-primary/20 shadow-card">
        <div className="flex items-center justify-center">
          <ShoppingCart className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </Card>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Card className="p-6 gradient-accent border-primary/20 shadow-card text-center">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Your cart is empty</p>
        <Button variant="outline" size="sm" onClick={onViewCart}>
          Start Shopping
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 gradient-accent border-primary/20 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary" />
          Cart
        </h3>
        <Badge className="text-xs">{cartItems.length}</Badge>
      </div>

      <div className="space-y-2 mb-3 max-h-[180px] overflow-y-auto">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 p-2 bg-background/20 rounded text-xs">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{item.products?.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.quantity} × ₱{getEffectivePrice(item.products).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-primary text-xs whitespace-nowrap">
                ₱{(getEffectivePrice(item.products) * item.quantity).toFixed(2)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeFromCart(item.id)}
                className="h-5 w-5 p-0"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Total:</span>
          <span className="font-bold text-lg text-primary">
            ₱{calculateTotal().toFixed(2)}
          </span>
        </div>
        <Button onClick={onViewCart} className="w-full h-8 text-xs">
          <ShoppingCart className="w-3 h-3 mr-1" />
          View Cart
        </Button>
      </div>
    </Card>
  );
};
