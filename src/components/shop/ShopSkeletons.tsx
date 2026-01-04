import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ProductCardSkeleton = () => (
  <Card className="overflow-hidden border-0 shadow-sm bg-card rounded-lg">
    <div className="aspect-square relative overflow-hidden">
      <Skeleton className="w-full h-full" />
    </div>
    <div className="p-1.5 space-y-1">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-6 w-full mt-1" />
    </div>
  </Card>
);

export const ProductGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-3 gap-1.5">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export const CategorySliderSkeleton = () => (
  <div className="flex gap-1.5 py-1 overflow-hidden">
    <Skeleton className="h-7 w-14 rounded-full shrink-0" />
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className="h-7 w-16 rounded-full shrink-0" />
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
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border px-2 py-2">
      <div className="flex items-center gap-2 max-w-7xl mx-auto">
        <Skeleton className="flex-1 h-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>

    <div className="max-w-7xl mx-auto px-2 mt-2 space-y-2">
      {/* Account Overview Skeleton */}
      <Skeleton className="h-16 w-full rounded-lg" />

      {/* Tabs Skeleton */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded" />
        ))}
      </div>

      {/* Ad Slider */}
      <AdSliderSkeleton />

      {/* Categories */}
      <CategorySliderSkeleton />

      {/* Products Grid - 3 columns */}
      <ProductGridSkeleton count={6} />
    </div>
  </div>
);
