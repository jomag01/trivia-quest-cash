// OptimizedImage - Connection-aware lazy loading image component
import { useState, useEffect, useRef, memo } from 'react';
import { connectionAwareLoader } from '@/lib/performance/ConnectionAwareLoader';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  placeholder?: 'blur' | 'skeleton' | 'none';
  onLoad?: () => void;
  onError?: () => void;
}

// Blur placeholder SVG
const BLUR_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 400 300%22%3E%3Cfilter id%3D%22b%22 color-interpolation-filters%3D%22sRGB%22%3E%3CfeGaussianBlur stdDeviation%3D%2220%22%2F%3E%3C%2Ffilter%3E%3Crect width%3D%22100%25%22 height%3D%22100%25%22 fill%3D%22%23e5e7eb%22 filter%3D%22url(%23b)%22%2F%3E%3C%2Fsvg%3E';

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  priority = 'medium',
  placeholder = 'blur',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(priority === 'critical');
  const imgRef = useRef<HTMLImageElement>(null);

  // Get optimized image URL based on connection
  const optimizedSrc = connectionAwareLoader.getOptimizedImageUrl(src, width);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority === 'critical' || !imgRef.current) {
      setInView(true);
      return;
    }

    const config = connectionAwareLoader.getConfig();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: config.lazyLoadThreshold, threshold: 0.1 }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    onError?.();
  };

  // Skeleton placeholder
  if (!inView || (!isLoaded && placeholder === 'skeleton')) {
    return (
      <div 
        ref={imgRef as any}
        className={cn(
          "bg-muted animate-pulse",
          className
        )}
        style={{ width, height, minHeight: height || 100 }}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ width, height }}>
      {/* Blur placeholder */}
      {!isLoaded && placeholder === 'blur' && (
        <img
          src={BLUR_PLACEHOLDER}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}
      
      {/* Actual image */}
      {inView && !error && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority === 'critical' ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          Failed to load
        </div>
      )}
    </div>
  );
});

export default OptimizedImage;
