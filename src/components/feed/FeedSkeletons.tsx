// Ultra-fast skeleton loaders for instant visual feedback
// Renders immediately without blocking on data - Dark X theme

import { memo } from "react";

// Single post skeleton - memoized for performance
export const PostSkeleton = memo(function PostSkeleton() {
  return (
    <article className="flex gap-3 px-4 py-3 border-b border-zinc-800/50 animate-pulse">
      {/* Avatar skeleton */}
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
      
      {/* Content skeleton */}
      <div className="flex-1 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="h-4 bg-zinc-800 rounded w-24" />
          <div className="h-3 bg-zinc-800/70 rounded w-16" />
          <div className="h-3 bg-zinc-800/50 rounded w-8" />
        </div>
        
        {/* Text content */}
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-full" />
          <div className="h-4 bg-zinc-800/80 rounded w-4/5" />
        </div>
        
        {/* Media placeholder (50% chance) */}
        <div className="h-48 bg-zinc-800 rounded-2xl" />
        
        {/* Action bar */}
        <div className="flex items-center justify-between pt-1 max-w-md">
          <div className="h-4 w-8 bg-zinc-800/60 rounded" />
          <div className="h-4 w-8 bg-zinc-800/60 rounded" />
          <div className="h-4 w-8 bg-zinc-800/60 rounded" />
          <div className="h-4 w-8 bg-zinc-800/60 rounded" />
          <div className="h-4 w-12 bg-zinc-800/60 rounded" />
        </div>
      </div>
    </article>
  );
});

// Compact skeleton without media
export const PostSkeletonCompact = memo(function PostSkeletonCompact() {
  return (
    <article className="flex gap-3 px-4 py-3 border-b border-zinc-800/50 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-zinc-800 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-zinc-800 rounded w-20" />
          <div className="h-3 bg-zinc-800/70 rounded w-12" />
        </div>
        <div className="h-4 bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-800/80 rounded w-3/4" />
        <div className="flex items-center gap-8 pt-2">
          <div className="h-3 w-6 bg-zinc-800/60 rounded" />
          <div className="h-3 w-6 bg-zinc-800/60 rounded" />
          <div className="h-3 w-6 bg-zinc-800/60 rounded" />
        </div>
      </div>
    </article>
  );
});

// Feed skeleton list - shows immediately
export const FeedSkeletonList = memo(function FeedSkeletonList({ 
  count = 5,
  variant = "full" 
}: { 
  count?: number;
  variant?: "full" | "compact";
}) {
  const Skeleton = variant === "compact" ? PostSkeletonCompact : PostSkeleton;
  
  return (
    <div className="divide-y divide-zinc-800/50">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
});

// Loading spinner for infinite scroll
export const InfiniteScrollLoader = memo(function InfiniteScrollLoader() {
  return (
    <div className="flex justify-center py-4">
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
});

export default FeedSkeletonList;
