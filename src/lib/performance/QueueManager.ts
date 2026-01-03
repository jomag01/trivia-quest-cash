// Request Queue Manager for 100M+ Concurrent Users
// Implements priority queuing, backpressure, and graceful degradation

export type Priority = 'critical' | 'high' | 'normal' | 'low';

interface QueuedRequest<T> {
  id: string;
  priority: Priority;
  timestamp: number;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries: number;
  maxRetries: number;
}

interface QueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  processInterval: number;
  retryDelay: number;
  priorityWeights: Record<Priority, number>;
}

class QueueManager {
  private static instance: QueueManager;
  private queues: Map<Priority, QueuedRequest<any>[]> = new Map();
  private activeCount = 0;
  private isProcessing = false;
  private config: QueueConfig;
  private metrics = {
    processed: 0,
    failed: 0,
    dropped: 0,
    avgWaitTime: 0
  };

  private constructor() {
    this.config = {
      maxConcurrent: 10,
      maxQueueSize: 1000,
      processInterval: 50,
      retryDelay: 1000,
      priorityWeights: {
        critical: 1000,
        high: 100,
        normal: 10,
        low: 1
      }
    };

    // Initialize queues
    (['critical', 'high', 'normal', 'low'] as Priority[]).forEach(p => {
      this.queues.set(p, []);
    });

    this.startProcessing();
  }

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  // Enqueue a request with priority
  enqueue<T>(
    execute: () => Promise<T>,
    priority: Priority = 'normal',
    maxRetries = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const totalQueueSize = this.getTotalQueueSize();
      
      // Apply backpressure - reject low priority when queue is full
      if (totalQueueSize >= this.config.maxQueueSize) {
        if (priority === 'low' || priority === 'normal') {
          this.metrics.dropped++;
          reject(new Error('Queue full - request dropped'));
          return;
        }
        // For critical/high, drop oldest low priority items
        this.dropLowestPriority();
      }

      const request: QueuedRequest<T> = {
        id: crypto.randomUUID(),
        priority,
        timestamp: Date.now(),
        execute,
        resolve,
        reject,
        retries: 0,
        maxRetries
      };

      this.queues.get(priority)!.push(request);
    });
  }

  // Execute immediately for critical operations
  async executeImmediate<T>(execute: () => Promise<T>): Promise<T> {
    return execute();
  }

  private getTotalQueueSize(): number {
    let total = 0;
    this.queues.forEach(queue => total += queue.length);
    return total;
  }

  private dropLowestPriority(): void {
    const lowQueue = this.queues.get('low')!;
    if (lowQueue.length > 0) {
      const dropped = lowQueue.shift()!;
      dropped.reject(new Error('Request dropped due to high load'));
      this.metrics.dropped++;
      return;
    }

    const normalQueue = this.queues.get('normal')!;
    if (normalQueue.length > 0) {
      const dropped = normalQueue.shift()!;
      dropped.reject(new Error('Request dropped due to high load'));
      this.metrics.dropped++;
    }
  }

  private startProcessing(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const process = () => {
      while (this.activeCount < this.config.maxConcurrent) {
        const request = this.getNextRequest();
        if (!request) break;

        this.activeCount++;
        this.processRequest(request);
      }

      if (this.isProcessing) {
        setTimeout(process, this.config.processInterval);
      }
    };

    process();
  }

  private getNextRequest(): QueuedRequest<any> | null {
    // Process in priority order
    for (const priority of ['critical', 'high', 'normal', 'low'] as Priority[]) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  private async processRequest(request: QueuedRequest<any>): Promise<void> {
    try {
      const result = await request.execute();
      const waitTime = Date.now() - request.timestamp;
      this.updateAvgWaitTime(waitTime);
      this.metrics.processed++;
      request.resolve(result);
    } catch (error) {
      if (request.retries < request.maxRetries) {
        request.retries++;
        // Re-queue with delay
        setTimeout(() => {
          this.queues.get(request.priority)!.unshift(request);
        }, this.config.retryDelay * request.retries);
      } else {
        this.metrics.failed++;
        request.reject(error as Error);
      }
    } finally {
      this.activeCount--;
    }
  }

  private updateAvgWaitTime(waitTime: number): void {
    const total = this.metrics.processed;
    this.metrics.avgWaitTime = 
      (this.metrics.avgWaitTime * (total - 1) + waitTime) / total;
  }

  // Get queue statistics
  getStats(): {
    queued: Record<Priority, number>;
    active: number;
    metrics: typeof this.metrics;
  } {
    const queued: Record<Priority, number> = {
      critical: 0,
      high: 0,
      normal: 0,
      low: 0
    };

    this.queues.forEach((queue, priority) => {
      queued[priority as Priority] = queue.length;
    });

    return {
      queued,
      active: this.activeCount,
      metrics: { ...this.metrics }
    };
  }

  // Configure queue behavior
  configure(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Pause queue processing
  pause(): void {
    this.isProcessing = false;
  }

  // Resume queue processing
  resume(): void {
    this.startProcessing();
  }

  // Clear all queues (emergency)
  clearAll(): void {
    this.queues.forEach((queue, priority) => {
      queue.forEach(req => {
        req.reject(new Error('Queue cleared'));
      });
      this.queues.set(priority as Priority, []);
    });
    this.metrics.dropped += this.getTotalQueueSize();
  }
}

export const queueManager = QueueManager.getInstance();

// Decorator for automatic queueing
export function queued<T>(priority: Priority = 'normal') {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      return queueManager.enqueue(() => originalMethod.apply(this, args), priority);
    };

    return descriptor;
  };
}
