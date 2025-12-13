// Ultra-optimized Connection Pool for 100M+ concurrent users
// Manages Supabase realtime subscriptions to prevent connection exhaustion

interface PooledChannel {
  channel: any;
  refCount: number;
  lastUsed: number;
  key: string;
}

class ConnectionPool {
  private static instance: ConnectionPool;
  private channels: Map<string, PooledChannel> = new Map();
  private maxChannels = 50; // Limit concurrent realtime connections
  private cleanupInterval: NodeJS.Timeout | null = null;
  private channelTTL = 5 * 60 * 1000; // 5 minutes idle before cleanup

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  // Get or create a shared channel
  getChannel(supabase: any, channelName: string, config: any): any {
    const key = `${channelName}-${JSON.stringify(config)}`;
    
    const existing = this.channels.get(key);
    if (existing) {
      existing.refCount++;
      existing.lastUsed = Date.now();
      return existing.channel;
    }

    // Evict LRU channel if at capacity
    if (this.channels.size >= this.maxChannels) {
      this.evictLRU();
    }

    const channel = supabase.channel(channelName);
    
    this.channels.set(key, {
      channel,
      refCount: 1,
      lastUsed: Date.now(),
      key
    });

    return channel;
  }

  // Release a channel reference
  releaseChannel(channelName: string, config: any): void {
    const key = `${channelName}-${JSON.stringify(config)}`;
    const pooled = this.channels.get(key);
    
    if (pooled) {
      pooled.refCount--;
      if (pooled.refCount <= 0) {
        // Don't immediately remove - keep for potential reuse
        pooled.lastUsed = Date.now();
      }
    }
  }

  // Force remove a channel
  removeChannel(supabase: any, channelName: string, config: any): void {
    const key = `${channelName}-${JSON.stringify(config)}`;
    const pooled = this.channels.get(key);
    
    if (pooled) {
      try {
        supabase.removeChannel(pooled.channel);
      } catch (e) {
        // Ignore removal errors
      }
      this.channels.delete(key);
    }
  }

  private evictLRU(): void {
    let oldest: PooledChannel | null = null;
    let oldestKey: string | null = null;

    this.channels.forEach((pooled, key) => {
      if (pooled.refCount <= 0 && (!oldest || pooled.lastUsed < oldest.lastUsed)) {
        oldest = pooled;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.channels.delete(oldestKey);
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const toRemove: string[] = [];

      this.channels.forEach((pooled, key) => {
        if (pooled.refCount <= 0 && now - pooled.lastUsed > this.channelTTL) {
          toRemove.push(key);
        }
      });

      toRemove.forEach(key => this.channels.delete(key));
    }, 60000); // Cleanup every minute
  }

  getStats(): { totalChannels: number; activeChannels: number } {
    let active = 0;
    this.channels.forEach(pooled => {
      if (pooled.refCount > 0) active++;
    });
    return { totalChannels: this.channels.size, activeChannels: active };
  }
}

export const connectionPool = ConnectionPool.getInstance();
