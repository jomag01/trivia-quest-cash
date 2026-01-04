import { memo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Star, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    base_price: number;
    promo_price?: number | null;
    promo_active?: boolean;
    image_url?: string | null;
    diamond_reward?: number;
    combined_sales?: number;
    combined_rating?: number;
    review_count?: number;
    sold_count?: number;
    rating?: number;
  };
  inWishlist?: boolean;
  onProductClick: (product: any) => void;
  onAddToCart?: (productId: string, e: React.MouseEvent) => void;
  onToggleWishlist?: (productId: string, e: React.MouseEvent) => void;
}

// Lazy loading image with placeholder
const LazyImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full bg-muted">
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <Package className="w-6 h-6 text-muted-foreground/30 animate-pulse" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <Package className="w-6 h-6 text-muted-foreground/30" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

const LazadaProductCard = memo(({
  product,
  inWishlist = false,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
}: ProductCardProps) => {
  const effectivePrice = product.promo_active && product.promo_price 
    ? product.promo_price 
    : product.base_price;
  
  const hasDiscount = product.promo_active && product.promo_price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.base_price - (product.promo_price || 0)) / product.base_price) * 100)
    : 0;

  const soldCount = product.combined_sales || product.sold_count || 0;
  const rating = product.combined_rating || product.rating || 0;

  const handleClick = useCallback(() => {
    onProductClick(product);
  }, [product, onProductClick]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart?.(product.id, e);
  }, [product.id, onAddToCart]);

  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist?.(product.id, e);
  }, [product.id, onToggleWishlist]);

  return (
    <Card 
      className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card rounded-lg"
      onClick={handleClick}
    >
      {/* Product Image - Compact square */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {product.image_url ? (
          <LazyImage src={product.image_url} alt={product.name} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Package className="w-6 h-6" />
          </div>
        )}
        
        {/* Discount badge */}
        {hasDiscount && (
          <Badge className="absolute top-1 left-1 text-[8px] px-1 py-0 h-4 bg-destructive text-destructive-foreground font-bold rounded">
            -{discountPercent}%
          </Badge>
        )}

        {/* Diamond reward badge */}
        {product.diamond_reward && product.diamond_reward > 0 && (
          <Badge className="absolute bottom-1 left-1 text-[8px] px-1 py-0 h-4 bg-primary text-primary-foreground rounded">
            💎{product.diamond_reward}
          </Badge>
        )}

        {/* Wishlist button */}
        {onToggleWishlist && (
          <button
            onClick={handleToggleWishlist}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <Heart className={cn("w-3 h-3", inWishlist && "fill-destructive text-destructive")} />
          </button>
        )}
      </div>
      
      {/* Product Info - Compact */}
      <div className="p-1.5">
        {/* Product name - 2 lines max */}
        <h3 className="text-[10px] font-medium line-clamp-2 leading-tight text-foreground min-h-[24px]">
          {product.name}
        </h3>

        {/* Price section */}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs font-bold text-destructive">
            ₱{effectivePrice.toLocaleString()}
          </span>
          {hasDiscount && (
            <span className="text-[9px] text-muted-foreground line-through">
              ₱{product.base_price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Sales & Rating row */}
        <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
          <div className="flex items-center gap-0.5">
            {rating > 0 && (
              <>
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)}</span>
              </>
            )}
          </div>
          <span>{soldCount > 0 ? `${soldCount.toLocaleString()} sold` : ''}</span>
        </div>

        {/* Add to cart button */}
        {onAddToCart && (
          <button
            onClick={handleAddToCart}
            className="w-full mt-1.5 h-6 text-[9px] font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded flex items-center justify-center gap-1"
          >
            <ShoppingCart className="w-3 h-3" />
            Add
          </button>
        )}
      </div>
    </Card>
  );
});

LazadaProductCard.displayName = 'LazadaProductCard';

export default LazadaProductCard;
