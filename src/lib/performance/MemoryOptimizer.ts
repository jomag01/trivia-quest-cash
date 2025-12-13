// Memory Optimizer for 100M+ concurrent users
// Aggressive memory management and garbage collection hints

// Polyfill check for WeakRef
declare const WeakRef: any;

class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private imageCache: Map<string, any> = new Map(); // WeakRef when supported
  private dataCache: Map<string, { data: any; size: number; timestamp: number }> = new Map();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB max cache
  private currentCacheSize = 0;
  private gcInterval: NodeJS.Timeout | null = null;
  private supportsWeakRef = typeof WeakRef !== 'undefined';

  private constructor() {
    this.startGCMonitor();
    this.setupVisibilityHandler();
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  // Cache data with size tracking
  cacheData(key: string, data: any): void {
    const size = this.estimateSize(data);
    
    // Evict if necessary
    while (this.currentCacheSize + size > this.maxCacheSize && this.dataCache.size > 0) {
      this.evictOldest();
    }

    this.dataCache.set(key, { data, size, timestamp: Date.now() });
    this.currentCacheSize += size;
  }

  getCachedData<T>(key: string): T | null {
    const entry = this.dataCache.get(key);
    if (entry) {
      entry.timestamp = Date.now(); // Update access time
      return entry.data as T;
    }
    return null;
  }

  // Image caching - uses WeakRef when available, falls back to regular ref
  cacheImage(url: string, img: HTMLImageElement): void {
    if (this.supportsWeakRef) {
      this.imageCache.set(url, new WeakRef(img));
    } else {
      // Fallback: store directly but with size limit
      if (this.imageCache.size > 100) {
        // Remove oldest entries
        const keys = Array.from(this.imageCache.keys()).slice(0, 20);
        keys.forEach(k => this.imageCache.delete(k));
      }
      this.imageCache.set(url, img);
    }
  }

  getCachedImage(url: string): HTMLImageElement | null {
    const ref = this.imageCache.get(url);
    if (!ref) return null;
    
    if (this.supportsWeakRef) {
      const img = ref.deref();
      if (img) return img;
      // Reference was collected, remove entry
      this.imageCache.delete(url);
      return null;
    }
    
    return ref;
  }

  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return str ? str.length * 2 : 0; // Rough UTF-16 estimate
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    this.dataCache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldest = key;
      }
    });

    if (oldest) {
      const entry = this.dataCache.get(oldest);
      if (entry) {
        this.currentCacheSize -= entry.size;
        this.dataCache.delete(oldest);
      }
    }
  }

  // Periodic GC hint and cleanup
  private startGCMonitor(): void {
    this.gcInterval = setInterval(() => {
      // Clean up dead refs (only if WeakRef supported)
      if (this.supportsWeakRef) {
        this.imageCache.forEach((ref, key) => {
          if (!ref.deref()) {
            this.imageCache.delete(key);
          }
        });
      }

      // Clear very old data cache entries
      const maxAge = 10 * 60 * 1000; // 10 minutes
      const now = Date.now();
      
      this.dataCache.forEach((entry, key) => {
        if (now - entry.timestamp > maxAge) {
          this.currentCacheSize -= entry.size;
          this.dataCache.delete(key);
        }
      });

      // Hint GC if available
      if ('gc' in globalThis && typeof (globalThis as any).gc === 'function') {
        (globalThis as any).gc();
      }
    }, 60000); // Every minute
  }

  // Aggressive cleanup when tab is hidden
  private setupVisibilityHandler(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.aggressiveCleanup();
        }
      });
    }
  }

  aggressiveCleanup(): void {
    // Keep only recent 20% of cache
    const entries = Array.from(this.dataCache.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    const keepCount = Math.ceil(entries.length * 0.2);
    
    entries.slice(keepCount).forEach(([key, entry]) => {
      this.currentCacheSize -= entry.size;
      this.dataCache.delete(key);
    });

    // Clear all image weak refs (they can be reloaded)
    this.imageCache.clear();

    // Dispatch event for components to cleanup
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('memory-cleanup'));
    }
  }

  getStats(): { cacheSize: number; maxSize: number; entries: number; images: number } {
    return {
      cacheSize: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      entries: this.dataCache.size,
      images: this.imageCache.size
    };
  }

  clearAll(): void {
    this.dataCache.clear();
    this.imageCache.clear();
    this.currentCacheSize = 0;
  }
}

export const memoryOptimizer = MemoryOptimizer.getInstance();
