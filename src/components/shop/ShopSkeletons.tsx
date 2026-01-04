import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Compact product card skeleton with fixed aspect ratio
export const ProductCardSkeleton = () => (
  <div className="bg-card rounded-lg overflow-hidden border border-border/40 flex flex-col">
    <div className="aspect-square bg-muted animate-pulse" />
    <div className="p-2 space-y-1.5">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-7 w-full mt-1" />
    </div>
  </div>
);

// Responsive grid skeleton
export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

// Swipeable category slider skeleton
export const CategorySliderSkeleton = () => (
  <div className="flex gap-1.5 py-1.5 overflow-hidden">
    {Array.from({ length: 7 }).map((_, i) => (
      <Skeleton 
        key={i} 
        className="h-12 w-[52px] rounded-lg shrink-0" 
      />
    ))}
  </div>
);

// Compact ad slider skeleton
export const AdSliderSkeleton = () => (
  <div className="w-full aspect-[2.5/1] max-h-28">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

// Quick tabs skeleton
export const QuickTabsSkeleton = () => (
  <div className="flex gap-1 py-1 overflow-hidden">
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-6 w-16 rounded-full shrink-0" />
    ))}
  </div>
);

// Sticky search skeleton
export const SearchBarSkeleton = () => (
  <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border px-3 py-2">
    <div className="flex items-center gap-2 max-w-7xl mx-auto">
      <Skeleton className="flex-1 h-9 rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
    </div>
  </div>
);

// Complete shop layout skeleton - Amazon/Lazada style
export const ShopLayoutSkeleton = () => (
  <div className="min-h-screen bg-background pb-20">
    {/* Sticky Search Header */}
    <SearchBarSkeleton />

    <div className="max-w-7xl mx-auto px-3 mt-2 space-y-2">
      {/* Account Overview - Compact */}
      <Skeleton className="h-14 w-full rounded-lg" />

      {/* Tabs */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-md" />
        ))}
      </div>

      {/* Quick Tabs */}
      <QuickTabsSkeleton />

      {/* Ad Slider - Compact */}
      <AdSliderSkeleton />

      {/* Category Slider */}
      <CategorySliderSkeleton />

      {/* Products Grid */}
      <ProductGridSkeleton count={8} />
    </div>
  </div>
);
