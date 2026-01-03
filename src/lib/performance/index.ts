// Ultra-optimized Performance utilities for 100M+ concurrent users

export { resourceManager } from './ResourceManager';
export { apiCache, withCache, prefetch } from './ApiCache';
export { bandwidthDetector, STREAMING_REQUIREMENTS } from './BandwidthDetector';
export type { BandwidthInfo, BandwidthRequirements } from './BandwidthDetector';

// Ultra-scale optimizations
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

// CDN, Queueing, and Database optimization
export { cdnHelper, generateSrcSet, createImageObserver } from './CDNHelper';
export { queueManager, queued } from './QueueManager';
export { dbOptimizer } from './DatabaseOptimizer';
