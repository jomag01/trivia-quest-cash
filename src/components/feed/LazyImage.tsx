// Lazy-loaded image component with blur placeholder
// Uses intersection observer for efficient offscreen detection

import { useState, useRef, useEffect, memo } from "react";

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage = memo(function LazyImage({
  src,
  alt = "",
  className = "",
  placeholderClassName = "",
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
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
  }, []);

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
          src={src}
          alt={alt}
          className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          loading="lazy"
          decoding="async"
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
