import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Heart, Star, Zap, Brain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  base_price: number;
  promo_price?: number | null;
  promo_active?: boolean;
  image_url?: string | null;
  stock_quantity?: number;
  diamond_reward?: number;
  combined_sales?: number;
  combined_rating?: number;
  review_count?: number;
  ai_pick?: boolean;
  trending?: boolean;
  fast_seller?: boolean;
  has_installment?: boolean;
}

interface CompactProductCardProps {
  product: Product;
  inCart?: boolean;
  inWishlist?: boolean;
  onProductClick: (product: Product) => void;
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  showRatings?: boolean;
}

// Blur placeholder image component with fixed aspect ratio
const ProductImage = memo(({ src, alt }: { src?: string | null; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
        <ShoppingCart className="w-6 h-6 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Blur placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
});

ProductImage.displayName = 'ProductImage';

const CompactProductCard = memo(({
  product,
  inCart = false,
  inWishlist = false,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  showRatings = true,
}: CompactProductCardProps) => {
  const effectivePrice = product.promo_active && product.promo_price 
    ? product.promo_price 
    : product.base_price;
  
  const hasDiscount = product.promo_active && product.promo_price;
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.promo_price! / product.base_price) * 100)
    : 0;
  const isOutOfStock = !product.stock_quantity || product.stock_quantity === 0;

  const handleClick = useCallback(() => {
    onProductClick(product);
  }, [product, onProductClick]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOutOfStock) {
      onAddToCart(product.id);
    }
  }, [product.id, onAddToCart, isOutOfStock]);

  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist(product.id);
  }, [product.id, onToggleWishlist]);

  return (
    <div 
      className="bg-card rounded-lg overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
      onClick={handleClick}
    >
      {/* Image Container - Fixed 1:1 aspect ratio */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <ProductImage src={product.image_url} alt={product.name} />
        
        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-1 left-1 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
            -{discountPercent}%
          </div>
        )}
        
        {/* AI/Trending Badges */}
        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
          {product.ai_pick && (
            <div className="bg-primary/90 text-primary-foreground text-[8px] font-medium px-1 py-0.5 rounded flex items-center gap-0.5">
              <Brain className="w-2.5 h-2.5" />
              AI
            </div>
          )}
          {product.trending && (
            <div className="bg-orange-500/90 text-white text-[8px] font-medium px-1 py-0.5 rounded flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
            </div>
          )}
          {product.fast_seller && (
            <div className="bg-green-500/90 text-white text-[8px] font-medium px-1 py-0.5 rounded flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {/* Diamond Reward */}
        {product.diamond_reward && product.diamond_reward > 0 && (
          <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[8px] font-medium px-1 py-0.5 rounded">
            💎 {product.diamond_reward}
          </div>
        )}

        {/* Wishlist Button */}
        <button 
          onClick={handleToggleWishlist}
          className="absolute bottom-1 right-1 p-1 bg-background/80 rounded-full hover:bg-background transition-colors"
        >
          <Heart className={cn(
            "w-3.5 h-3.5 transition-colors",
            inWishlist ? "fill-destructive text-destructive" : "text-muted-foreground"
          )} />
        </button>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-xs font-medium text-destructive">Out of Stock</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-2 flex-1 flex flex-col min-h-0">
        {/* Product Name - 2 lines max */}
        <h3 className="text-[11px] font-medium leading-tight line-clamp-2 text-foreground mb-1">
          {product.name}
        </h3>

        {/* Rating - Deferred */}
        {showRatings && product.combined_rating && product.combined_rating > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            <span>{product.combined_rating.toFixed(1)}</span>
            {product.review_count && product.review_count > 0 && (
              <span>({product.review_count > 1000 ? `${(product.review_count/1000).toFixed(1)}k` : product.review_count})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-1 mt-auto">
          <span className="text-sm font-bold text-destructive">
            ₱{effectivePrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          {hasDiscount && (
            <span className="text-[9px] text-muted-foreground line-through">
              ₱{product.base_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
        </div>

        {/* Installment Badge */}
        {product.has_installment && (
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-primary/40 text-primary">
              Installment Available
            </Badge>
          </div>
        )}

        {/* Sales Count */}
        {product.combined_sales && product.combined_sales > 0 && (
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {product.combined_sales > 1000 
              ? `${(product.combined_sales/1000).toFixed(1)}k sold`
              : `${product.combined_sales} sold`}
          </p>
        )}

        {/* Add to Cart Button */}
        <Button 
          size="sm"
          className={cn(
            "w-full h-7 text-[10px] mt-1.5 gap-1",
            inCart 
              ? "bg-primary/20 text-primary hover:bg-primary/30" 
              : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          )}
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <ShoppingCart className="w-3 h-3" />
          {inCart ? "In Cart" : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
});

CompactProductCard.displayName = 'CompactProductCard';

export default CompactProductCard;
