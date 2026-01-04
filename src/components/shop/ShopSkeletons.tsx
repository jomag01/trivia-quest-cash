import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => (
  <Card className="overflow-hidden border-border/50 flex flex-col bg-card">
    <div className="aspect-square relative overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
    <div className="p-2 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-full mt-2" />
    </div>
  </Card>
);

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export const CategorySliderSkeleton = () => (
  <div className="flex gap-2 py-2 overflow-hidden">
    <Skeleton className="h-8 w-16 rounded-full shrink-0" />
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
    ))}
  </div>
);

export const AdSliderSkeleton = () => (
  <div className="w-full aspect-[3/1] md:aspect-[4/1]">
    <Skeleton className="w-full h-full rounded-lg" />
  </div>
);

export const ShopLayoutSkeleton = () => (
  <div className="min-h-screen bg-background pb-20">
    {/* Header Skeleton */}
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border px-3 py-2">
      <div className="flex items-center gap-2 max-w-7xl mx-auto">
        <Skeleton className="flex-1 h-10 rounded-md" />
        <Skeleton className="h-10 w-10 rounded-md" />
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-3 mt-3 space-y-3">
      {/* Account Overview Skeleton */}
      <Skeleton className="h-20 w-full rounded-lg" />

      {/* Tabs Skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>

      {/* Ad Slider */}
      <AdSliderSkeleton />

      {/* Categories */}
      <CategorySliderSkeleton />

      {/* Products Grid */}
      <ProductGridSkeleton count={8} />
    </div>
  </div>
);
