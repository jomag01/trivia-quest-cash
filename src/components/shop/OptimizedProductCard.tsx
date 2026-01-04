import { memo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Heart, Star } from "lucide-react";
import { ProductShareButton } from "@/components/ProductShareButton";
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
      className="overflow-hidden border-border/50 hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer group bg-card"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image */}
      <div className="aspect-square overflow-hidden bg-muted relative">
        {product.image_url ? (
          <>
            <LazyImage 
              src={product.image_url} 
              alt={product.name}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                product.hover_image_url ? 'group-hover:opacity-0' : 'group-hover:scale-105'
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
            <Package className="w-8 h-8" />
          </div>
        )}
        
        {hasDiscount && (
          <Badge className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 bg-destructive text-destructive-foreground">
            Sale
          </Badge>
        )}
        {product.diamond_reward && product.diamond_reward > 0 && (
          <Badge className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 bg-primary text-primary-foreground">
            💎 {product.diamond_reward}
          </Badge>
        )}
      </div>
      
      <div className="p-2 flex-1 flex flex-col">
        <h3 className="text-xs font-medium mb-1 line-clamp-2 leading-tight text-foreground">
          {product.name}
        </h3>

        {/* Deferred: Sales & Ratings */}
        {(showSales || showRatings) && (product.combined_sales || product.combined_rating) ? (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            {showSales && product.combined_sales && product.combined_sales > 0 && (
              <span className="flex items-center gap-1">
                <span aria-hidden>📊</span>
                <span className="font-medium">{product.combined_sales.toLocaleString()} sold</span>
              </span>
            )}
            {showRatings && product.combined_rating && product.combined_rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span className="font-medium">
                  {product.combined_rating.toFixed(1)}
                  {product.review_count && product.review_count > 0 && ` (${product.review_count})`}
                </span>
              </span>
            )}
          </div>
        ) : null}

        <div className="flex items-center gap-1 mb-1.5">
          <span className="text-sm font-bold text-destructive">
            ₱{effectivePrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-muted-foreground line-through">
              ₱{product.base_price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="mt-auto space-y-1">
          <Button 
            className="w-full h-7 text-[10px] bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
            onClick={handleBuyNow}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            {isOutOfStock ? "Out" : "Buy Now"}
          </Button>
          
          <div className="grid grid-cols-3 gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 text-[9px] border-destructive text-destructive hover:bg-destructive/10 px-1" 
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              {inCart ? "✓" : "Cart"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 text-[9px] px-1" 
              onClick={handleToggleWishlist}
            >
              <Heart className={cn("w-2.5 h-2.5", inWishlist && "fill-destructive text-destructive")} />
            </Button>
            <ProductShareButton 
              productId={product.id} 
              productName={product.name} 
              size="sm" 
              className="h-6 text-[9px] px-1" 
            />
          </div>
        </div>
      </div>
    </Card>
  );
});

OptimizedProductCard.displayName = 'OptimizedProductCard';

export default OptimizedProductCard;
