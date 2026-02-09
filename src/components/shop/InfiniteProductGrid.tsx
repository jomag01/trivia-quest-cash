import { memo, useEffect, useRef, useCallback, useState } from "react";
import { ProductCardSkeleton } from "./ShopSkeletons";
import CompactProductCard from "./CompactProductCard";
import { Loader2 } from "lucide-react";

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

interface InfiniteProductGridProps {
  products: Product[];
  inCart: Set<string>;
  inWishlist: Set<string>;
  onProductClick: (product: Product) => void;
  onAddToCart: (productId: string) => void;
  onToggleWishlist: (productId: string) => void;
  loading?: boolean;
  showRatings?: boolean;
  batchSize?: number;
}

const InfiniteProductGrid = memo(({
  products,
  inCart,
  inWishlist,
  onProductClick,
  onAddToCart,
  onToggleWishlist,
  loading = false,
  showRatings = true,
  batchSize = 8,
}: InfiniteProductGridProps) => {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          // Simulate network delay for smooth UX
          requestAnimationFrame(() => {
            setVisibleCount(prev => Math.min(prev + batchSize, products.length));
            setIsLoadingMore(false);
          });
        }
      },
      { rootMargin: '200px' }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, batchSize, products.length]);

  // Reset visible count when products change significantly
  useEffect(() => {
    setVisibleCount(batchSize);
  }, [products.length > 0 ? products[0]?.id : null, batchSize]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: batchSize }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground text-sm">No products found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Product Grid - Responsive columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {visibleProducts.map((product) => (
          <CompactProductCard
            key={product.id}
            product={product}
            inCart={inCart.has(product.id)}
            inWishlist={inWishlist.has(product.id)}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
            onToggleWishlist={onToggleWishlist}
            showRatings={showRatings}
          />
        ))}
      </div>

      {/* Infinite Scroll Loader */}
      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Loading more products...</span>
          </div>
        </div>
      )}

      {/* End of List */}
      {!hasMore && products.length > batchSize && (
        <p className="text-center text-xs text-muted-foreground py-2">
          Showing all {products.length} products
        </p>
      )}
    </div>
  );
});

InfiniteProductGrid.displayName = 'InfiniteProductGrid';

export default InfiniteProductGrid;
