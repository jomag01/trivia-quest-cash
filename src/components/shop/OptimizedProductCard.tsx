import { memo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    base_price: number;
    promo_price?: number | null;
    promo_active?: boolean;
    image_url?: string | null;
    hover_image_url?: string | null;
    stock_quantity?: number;
    diamond_reward?: number;
    combined_sales?: number;
    combined_rating?: number;
    review_count?: number;
  };
  inCart?: boolean;
  inWishlist?: boolean;
  onProductClick: (product: any) => void;
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  onBuyNow: (product: any) => void;
  // Defer these to load later
  showRatings?: boolean;
  showSales?: boolean;
}

// Fast loading image like Lazada - show placeholder, load eagerly
const LazyImage = memo(({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full bg-muted">
      {/* Solid color placeholder shown until image loads */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <Package className="w-8 h-8 text-muted-foreground/30 animate-pulse" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <Package className="w-8 h-8 text-muted-foreground/30" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn(
            className,
            "transition-opacity duration-200",
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

const OptimizedProductCard = memo(({
  product,
  inCart = false,
  inWishlist = false,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  onBuyNow,
  showRatings = true,
  showSales = true,
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const effectivePrice = product.promo_active && product.promo_price 
    ? product.promo_price 
    : product.base_price;
  
  const hasDiscount = product.promo_active && product.promo_price;
  const isOutOfStock = !product.stock_quantity || product.stock_quantity === 0;

  const handleClick = useCallback(() => {
    onProductClick(product);
  }, [product, onProductClick]);

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product.id);
  }, [product.id, onAddToCart]);

  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist(product.id);
  }, [product.id, onToggleWishlist]);

  const handleBuyNow = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onBuyNow(product);
  }, [product, onBuyNow]);

  return (
    <Card 
      className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-card rounded-lg"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image - Compact square */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {product.image_url ? (
          <>
            <LazyImage 
              src={product.image_url} 
              alt={product.name}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                product.hover_image_url ? 'group-hover:opacity-0' : ''
              )}
            />
            {product.hover_image_url && isHovered && (
              <LazyImage 
                src={product.hover_image_url}
                alt={`${product.name} hover`}
                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              />
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Package className="w-6 h-6" />
          </div>
        )}
        
        {/* Discount badge */}
        {hasDiscount && (
          <Badge className="absolute top-1 right-1 text-[8px] px-1 py-0 h-4 bg-destructive text-destructive-foreground font-bold rounded">
            Sale
          </Badge>
        )}
        {/* Diamond reward badge */}
        {product.diamond_reward && product.diamond_reward > 0 && (
          <Badge className="absolute top-1 left-1 text-[8px] px-1 py-0 h-4 bg-primary text-primary-foreground rounded">
            💎{product.diamond_reward}
          </Badge>
        )}
      </div>
      
      {/* Product Info - Compact */}
      <div className="p-1.5">
        {/* Product name - 2 lines max */}
        <h3 className="text-[10px] font-medium line-clamp-2 leading-tight text-foreground min-h-[24px]">
          {product.name}
        </h3>

        {/* Sales & Ratings - Compact single line */}
        {(showSales || showRatings) && (product.combined_sales || product.combined_rating) ? (
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
            {showRatings && product.combined_rating && product.combined_rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                {product.combined_rating.toFixed(1)}
              </span>
            )}
            {showSales && product.combined_sales && product.combined_sales > 0 && (
              <span>· {product.combined_sales.toLocaleString()} sold</span>
            )}
          </div>
        ) : null}

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

        {/* Action buttons - Compact */}
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <Button 
            className="h-6 text-[9px] bg-destructive hover:bg-destructive/90 text-destructive-foreground px-1" 
            onClick={handleBuyNow}
            disabled={isOutOfStock}
          >
            {isOutOfStock ? "Out" : "Buy"}
          </Button>
          <div className="flex gap-0.5">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 flex-1 text-[9px] px-1" 
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 w-6 px-0" 
              onClick={handleToggleWishlist}
            >
              <Heart className={cn("w-3 h-3", inWishlist && "fill-destructive text-destructive")} />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

OptimizedProductCard.displayName = 'OptimizedProductCard';

export default OptimizedProductCard;
