// Lazy-loaded image component with blur placeholder, CDN optimization, WebP/AVIF
// Uses intersection observer for efficient offscreen detection

import { useState, useRef, useEffect, memo } from "react";
import { cdnHelper } from "@/lib/performance/CDNHelper";

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // Skip lazy loading for above-fold images
}

// Get device width for responsive images
const getDeviceWidth = (): number => {
  if (typeof window === 'undefined') return 640;
  return Math.min(window.innerWidth * (window.devicePixelRatio || 1), 1920);
};

// Generate optimized CDN URL with format and size
const getOptimizedUrl = (src: string): string => {
  if (!src || src.startsWith('data:')) return src;
  
  const width = getDeviceWidth();
  
  // Use CDN helper for Supabase URLs
  return cdnHelper.getImageURL(src, {
    width: Math.round(width),
    quality: 80,
    format: 'auto' // Let CDN decide WebP/AVIF based on Accept header
  });
};

export const LazyImage = memo(function LazyImage({
  src,
  alt = "",
  className = "",
  placeholderClassName = "",
  onLoad,
  onError,
  priority = false
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  const optimizedSrc = getOptimizedUrl(src);

  // Intersection observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip for priority images
    
    const element = imgRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(element);
          }
        });
      },
      {
        rootMargin: "200px", // Start loading 200px before visible
        threshold: 0.01
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div 
        ref={imgRef}
        className={`bg-muted flex items-center justify-center ${className}`}
      >
        <span className="text-muted-foreground text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Blur placeholder */}
      {!isLoaded && (
        <div 
          className={`absolute inset-0 bg-muted animate-pulse ${placeholderClassName}`}
          style={{
            backdropFilter: "blur(20px)",
          }}
        />
      )}
      
      {/* Actual image - only render when in view */}
      {isInView && (
        <img
          src={optimizedSrc}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      
      {/* Spacer for layout stability when image not loaded */}
      {!isInView && (
        <div className={`bg-muted ${className}`} style={{ minHeight: "200px" }} />
      )}
    </div>
  );
});

export default LazyImage;
