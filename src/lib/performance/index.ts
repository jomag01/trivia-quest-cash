// Ultra-optimized Performance utilities for 100M+ concurrent users

export { resourceManager } from './ResourceManager';
export { apiCache, withCache, prefetch } from './ApiCache';
export { bandwidthDetector, STREAMING_REQUIREMENTS } from './BandwidthDetector';
export type { BandwidthInfo, BandwidthRequirements } from './BandwidthDetector';

// New ultra-scale optimizations
export { connectionPool } from './ConnectionPool';
export { requestBatcher } from './RequestBatcher';
export { memoryOptimizer } from './MemoryOptimizer';
export { rateLimiter } from './RateLimiter';
export { 
  lazyWithCache, 
  preloadComponent, 
  preloadImage, 
  preloadImages,
  preloadModule,
  observeImage,
  unobserveImage,
  createVisibilityObserver 
} from './LazyLoader';
export { useVirtualScroll, InfiniteScrollManager } from './VirtualScrollManager';

// Connection-aware optimizations for slow connections
export { connectionAwareLoader, useConnectionAware } from './ConnectionAwareLoader';
export type { ConnectionQuality } from './ConnectionAwareLoader';
export { 
  loadImage, 
  preloadCriticalImages, 
  getPlaceholder,
  isImageLoaded,
  clearImageCache,
  registerLazyImage,
  unregisterLazyImage 
} from './AdaptiveImageLoader';
export { requestPrioritizer } from './RequestPrioritizer';
