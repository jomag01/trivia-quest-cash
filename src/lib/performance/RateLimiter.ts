// Client-side Rate Limiter for 100M+ concurrent users
// Prevents API abuse and manages request throttling

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, RateLimitConfig> = new Map();
  private records: Map<string, RequestRecord> = new Map();
  private queue: Map<string, Array<() => Promise<any>>> = new Map();
  private processing: Set<string> = new Set();

  private constructor() {
    // Default rate limits per endpoint type
    this.limits.set('api', { maxRequests: 100, windowMs: 60000 }); // 100/min
    this.limits.set('ai', { maxRequests: 10, windowMs: 60000 }); // 10/min for AI
    this.limits.set('upload', { maxRequests: 5, windowMs: 60000 }); // 5/min for uploads
    this.limits.set('realtime', { maxRequests: 200, windowMs: 60000 }); // 200/min for realtime
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  setLimit(type: string, config: RateLimitConfig): void {
    this.limits.set(type, config);
  }

  // Check if request is allowed
  canMakeRequest(type: string = 'api'): boolean {
    const limit = this.limits.get(type) || this.limits.get('api')!;
    const record = this.records.get(type);
    const now = Date.now();

    if (!record || now - record.windowStart >= limit.windowMs) {
      // New window
      this.records.set(type, { count: 1, windowStart: now });
      return true;
    }

    return record.count < limit.maxRequests;
  }

  // Record a request
  recordRequest(type: string = 'api'): void {
    const record = this.records.get(type);
    const now = Date.now();
    const limit = this.limits.get(type) || this.limits.get('api')!;

    if (!record || now - record.windowStart >= limit.windowMs) {
      this.records.set(type, { count: 1, windowStart: now });
    } else {
      record.count++;
    }
  }

  // Execute with rate limiting and queuing
  async execute<T>(
    type: string,
    fn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    if (this.canMakeRequest(type)) {
      this.recordRequest(type);
      return fn();
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const queuedFn = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };

      if (!this.queue.has(type)) {
        this.queue.set(type, []);
      }
      this.queue.get(type)!.push(queuedFn);

      // Start processing queue if not already
      this.processQueue(type);
    });
  }

  private async processQueue(type: string): Promise<void> {
    if (this.processing.has(type)) return;
    this.processing.add(type);

    const limit = this.limits.get(type) || this.limits.get('api')!;
    
    while (this.queue.get(type)?.length) {
      if (!this.canMakeRequest(type)) {
        // Wait until next window
        const record = this.records.get(type);
        if (record) {
          const waitTime = limit.windowMs - (Date.now() - record.windowStart);
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime + 100));
          }
        }
      }

      const fn = this.queue.get(type)?.shift();
      if (fn) {
        this.recordRequest(type);
        await fn();
      }
    }

    this.processing.delete(type);
  }

  // Get remaining requests in current window
  getRemainingRequests(type: string = 'api'): number {
    const limit = this.limits.get(type) || this.limits.get('api')!;
    const record = this.records.get(type);
    const now = Date.now();

    if (!record || now - record.windowStart >= limit.windowMs) {
      return limit.maxRequests;
    }

    return Math.max(0, limit.maxRequests - record.count);
  }

  // Get time until rate limit resets
  getResetTime(type: string = 'api'): number {
    const limit = this.limits.get(type) || this.limits.get('api')!;
    const record = this.records.get(type);

    if (!record) return 0;

    const elapsed = Date.now() - record.windowStart;
    return Math.max(0, limit.windowMs - elapsed);
  }

  getStats(): Record<string, { remaining: number; resetIn: number; queued: number }> {
    const stats: Record<string, { remaining: number; resetIn: number; queued: number }> = {};
    
    this.limits.forEach((_, type) => {
      stats[type] = {
        remaining: this.getRemainingRequests(type),
        resetIn: this.getResetTime(type),
        queued: this.queue.get(type)?.length || 0
      };
    });

    return stats;
  }
}

export const rateLimiter = RateLimiter.getInstance();
