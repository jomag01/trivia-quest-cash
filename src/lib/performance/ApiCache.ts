// API Cache Manager - Caches API responses with TTL and compression support

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
}

class ApiCache {
  private static instance: ApiCache;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxCacheSize = 100; // Maximum number of cached entries
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache();
    }
    return ApiCache.instance;
  }

  // Set cache entry with optional TTL
  set<T>(key: string, data: T, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  // Get cached entry if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Delete specific entry
  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache entries
  clear(): void {
    this.cache.clear();
  }

  // Clear entries matching a pattern
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  // Get cache stats
  getStats(): { size: number; maxSize: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys())
    };
  }

  // Evict oldest entries
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10%
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  // Cleanup expired entries periodically
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      this.cache.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      });
    }, 60000); // Cleanup every minute
  }
}

export const apiCache = ApiCache.getInstance();

// Higher-order function to wrap API calls with caching
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }

  return fetcher().then(data => {
    apiCache.set(key, data, ttl);
    return data;
  });
}
