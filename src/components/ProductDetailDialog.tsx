import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Heart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  promo_price?: number;
  discount_percentage?: number;
  promo_active?: boolean;
  image_url?: string;
  stock_quantity?: number;
  product_categories?: {
    name: string;
  };
}

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuyNow: () => void;
  onAddToCart: () => void;
  onToggleWishlist: () => void;
  inCart: boolean;
  inWishlist: boolean;
}

export const ProductDetailDialog = ({
  product,
  open,
  onOpenChange,
  onBuyNow,
  onAddToCart,
  onToggleWishlist,
  inCart,
  inWishlist,
}: ProductDetailDialogProps) => {
  if (!product) return null;

  const effectivePrice = product.promo_active && product.promo_price
    ? product.promo_price
    : product.base_price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Product Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-background/20">
            <img
              src={product.image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400";
              }}
            />
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {product.promo_active && product.promo_price && (
              <Badge className="bg-red-500">
                {product.discount_percentage}% OFF
              </Badge>
            )}

            {product.product_categories && (
              <Badge variant="outline">
                {product.product_categories.name}
              </Badge>
            )}

            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-primary">
                  ₱{effectivePrice.toFixed(2)}
                </span>
                {product.promo_active && product.promo_price && (
                  <span className="text-lg text-muted-foreground line-through">
                    ₱{product.base_price.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Stock: {product.stock_quantity || 0} available
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{product.description}</p>
            </div>

            <div className="space-y-2 pt-4">
              <Button
                className="w-full"
                onClick={onBuyNow}
                disabled={!product.stock_quantity || product.stock_quantity === 0}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {product.stock_quantity > 0 ? "Buy Now" : "Out of Stock"}
              </Button>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={onAddToCart}
                  disabled={!product.stock_quantity || product.stock_quantity === 0 || inCart}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {inCart ? "In Cart" : "Add to Cart"}
                </Button>
                
                <Button
                  variant={inWishlist ? "default" : "outline"}
                  onClick={onToggleWishlist}
                >
                  <Heart className={`w-4 h-4 mr-2 ${inWishlist ? "fill-current" : ""}`} />
                  {inWishlist ? "Saved" : "Wishlist"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
