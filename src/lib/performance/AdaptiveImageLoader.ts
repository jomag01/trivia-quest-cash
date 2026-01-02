// Adaptive Image Loader for slow connections and 100M+ scale
// Progressive loading with blur-up, skeleton placeholders, and connection-aware quality

import { connectionAwareLoader } from './ConnectionAwareLoader';

interface ImageLoadOptions {
  priority?: 'critical' | 'high' | 'medium' | 'low';
  width?: number;
  height?: number;
  placeholder?: 'blur' | 'skeleton' | 'none';
}

// Tiny 1x1 transparent GIF for placeholder
const TRANSPARENT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Low-quality blur placeholder generator
const BLUR_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 viewBox%3D%220 0 400 300%22%3E%3Cfilter id%3D%22b%22 color-interpolation-filters%3D%22sRGB%22%3E%3CfeGaussianBlur stdDeviation%3D%2220%22%2F%3E%3C%2Ffilter%3E%3Crect width%3D%22100%25%22 height%3D%22100%25%22 fill%3D%22%23f3f4f6%22 filter%3D%22url(%23b)%22%2F%3E%3C%2Fsvg%3E';

// In-memory loaded images cache
const loadedImages = new Set<string>();

// Pending image loads for deduplication
const pendingLoads = new Map<string, Promise<void>>();

// Image load queue for prioritization
interface QueuedImage {
  src: string;
  priority: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

const imageQueue: QueuedImage[] = [];
let activeLoads = 0;

function processQueue() {
  const config = connectionAwareLoader.getConfig();
  const maxConcurrent = config.maxConcurrentRequests;

  while (activeLoads < maxConcurrent && imageQueue.length > 0) {
    // Sort by priority (higher first)
    imageQueue.sort((a, b) => b.priority - a.priority);
    const item = imageQueue.shift();
    
    if (item) {
      activeLoads++;
      const img = new Image();
      
      img.onload = () => {
        loadedImages.add(item.src);
        pendingLoads.delete(item.src);
        activeLoads--;
        item.resolve();
        processQueue();
      };
      
      img.onerror = () => {
        pendingLoads.delete(item.src);
        activeLoads--;
        item.reject(new Error(`Failed to load: ${item.src}`));
        processQueue();
      };
      
      img.src = item.src;
    }
  }
}

// Load image with priority and deduplication
export function loadImage(src: string, options: ImageLoadOptions = {}): Promise<void> {
  const priority = options.priority || 'medium';
  
  // Already loaded
  if (loadedImages.has(src)) {
    return Promise.resolve();
  }
  
  // Already loading
  if (pendingLoads.has(src)) {
    return pendingLoads.get(src)!;
  }
  
  // Check if we should load based on connection
  if (!connectionAwareLoader.shouldLoad(priority)) {
    return Promise.resolve(); // Skip low priority on slow connections
  }
  
  // Get optimized URL
  const optimizedSrc = connectionAwareLoader.getOptimizedImageUrl(src, options.width);
  
  const promise = new Promise<void>((resolve, reject) => {
    const priorityValue = priority === 'critical' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;
    imageQueue.push({ src: optimizedSrc, priority: priorityValue, resolve, reject });
    processQueue();
  });
  
  pendingLoads.set(src, promise);
  return promise;
}

// Preload critical images
export function preloadCriticalImages(srcs: string[]): void {
  srcs.forEach(src => loadImage(src, { priority: 'critical' }));
}

// Get placeholder for image
export function getPlaceholder(type?: 'blur' | 'skeleton' | 'none'): string {
  const config = connectionAwareLoader.getConfig();
  const placeholderType = type || config.imagePlaceholder;
  
  if (placeholderType === 'blur') return BLUR_PLACEHOLDER;
  if (placeholderType === 'skeleton') return TRANSPARENT_PLACEHOLDER;
  return TRANSPARENT_PLACEHOLDER;
}

// Check if image is loaded
export function isImageLoaded(src: string): boolean {
  return loadedImages.has(src);
}

// Clear loaded images cache (for memory management)
export function clearImageCache(): void {
  loadedImages.clear();
}

// Intersection Observer for lazy loading
let lazyObserver: IntersectionObserver | null = null;

function getLazyObserver(): IntersectionObserver {
  if (!lazyObserver) {
    const config = connectionAwareLoader.getConfig();
    
    lazyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            
            if (src) {
              img.src = connectionAwareLoader.getOptimizedImageUrl(src);
              img.removeAttribute('data-src');
              lazyObserver?.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: config.lazyLoadThreshold,
        threshold: 0.1,
      }
    );
  }
  
  return lazyObserver;
}

// Register image for lazy loading
export function registerLazyImage(img: HTMLImageElement, src: string): void {
  img.dataset.src = src;
  img.src = getPlaceholder();
  getLazyObserver().observe(img);
}

// Unregister lazy image
export function unregisterLazyImage(img: HTMLImageElement): void {
  getLazyObserver().unobserve(img);
}
