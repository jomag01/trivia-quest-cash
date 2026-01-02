// Request Prioritizer for 100M+ concurrent users
// Manages API request prioritization and throttling based on connection quality

import { connectionAwareLoader } from './ConnectionAwareLoader';

type Priority = 'critical' | 'high' | 'medium' | 'low' | 'background';

interface QueuedRequest<T> {
  id: string;
  priority: Priority;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  retryCount: number;
}

interface RequestConfig {
  priority?: Priority;
  timeout?: number;
  retries?: number;
  deduplicate?: boolean;
}

class RequestPrioritizer {
  private static instance: RequestPrioritizer;
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private maxConcurrent = 6;
  private processing = false;
  private dedupeMap = new Map<string, Promise<any>>();

  // Priority weights for sorting
  private priorityWeights: Record<Priority, number> = {
    'critical': 5,
    'high': 4,
    'medium': 3,
    'low': 2,
    'background': 1,
  };

  private constructor() {
    // Adjust max concurrent based on connection
    connectionAwareLoader.subscribe(config => {
      this.maxConcurrent = config.maxConcurrentRequests;
    });
  }

  static getInstance(): RequestPrioritizer {
    if (!RequestPrioritizer.instance) {
      RequestPrioritizer.instance = new RequestPrioritizer();
    }
    return RequestPrioritizer.instance;
  }

  // Execute request with priority
  async execute<T>(
    id: string,
    fetcher: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      priority = 'medium',
      timeout = 30000,
      retries = 2,
      deduplicate = true,
    } = config;

    // Check deduplication
    if (deduplicate && this.dedupeMap.has(id)) {
      return this.dedupeMap.get(id)!;
    }

    // Check if we should skip low priority on slow connections
    if (priority === 'background' && connectionAwareLoader.isSlowConnection()) {
      return Promise.reject(new Error('Skipped on slow connection'));
    }

    // Create the promise
    const promise = new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id,
        priority,
        execute: () => this.withTimeout(fetcher(), timeout),
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: retries,
      };

      this.queue.push(request);
      this.processQueue();
    });

    if (deduplicate) {
      this.dedupeMap.set(id, promise);
      promise.finally(() => {
        setTimeout(() => this.dedupeMap.delete(id), 100);
      });
    }

    return promise;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      // Sort by priority (higher first), then by timestamp (older first)
      this.queue.sort((a, b) => {
        const priorityDiff = this.priorityWeights[b.priority] - this.priorityWeights[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      const request = this.queue.shift();
      if (!request) continue;

      this.activeRequests++;

      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        if (request.retryCount > 0) {
          request.retryCount--;
          request.timestamp = Date.now(); // Reset timestamp for retry
          this.queue.push(request);
        } else {
          request.reject(error as Error);
        }
      } finally {
        this.activeRequests--;
      }
    }

    this.processing = false;

    // Continue processing if there are more items
    if (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      }),
    ]);
  }

  // Cancel pending requests by ID pattern
  cancelByPattern(pattern: RegExp): void {
    this.queue = this.queue.filter(req => {
      if (pattern.test(req.id)) {
        req.reject(new Error('Request cancelled'));
        return false;
      }
      return true;
    });
  }

  // Get queue stats
  getStats(): { queueLength: number; activeRequests: number; maxConcurrent: number } {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrent,
    };
  }

  // Clear all pending requests
  clear(): void {
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
    this.dedupeMap.clear();
  }
}

export const requestPrioritizer = RequestPrioritizer.getInstance();
