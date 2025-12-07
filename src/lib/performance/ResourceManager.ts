// Resource Manager - Handles memory leaks, cleanup, and performance optimization

type CleanupFunction = () => void;

class ResourceManager {
  private static instance: ResourceManager;
  private cleanupFunctions: Map<string, CleanupFunction> = new Map();
  private intervalIds: Set<NodeJS.Timeout> = new Set();
  private timeoutIds: Set<NodeJS.Timeout> = new Set();
  private eventListeners: Map<string, { target: EventTarget; type: string; listener: EventListener }> = new Map();
  private memoryWarningThreshold = 0.8; // 80% memory usage threshold

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  // Register cleanup function for component unmount
  registerCleanup(id: string, cleanup: CleanupFunction): void {
    this.cleanupFunctions.set(id, cleanup);
  }

  // Execute and remove cleanup function
  executeCleanup(id: string): void {
    const cleanup = this.cleanupFunctions.get(id);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(id);
    }
  }

  // Track intervals for cleanup
  trackInterval(intervalId: NodeJS.Timeout): void {
    this.intervalIds.add(intervalId);
  }

  // Track timeouts for cleanup
  trackTimeout(timeoutId: NodeJS.Timeout): void {
    this.timeoutIds.add(timeoutId);
  }

  // Clear tracked interval
  clearTrackedInterval(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    this.intervalIds.delete(intervalId);
  }

  // Clear tracked timeout
  clearTrackedTimeout(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
    this.timeoutIds.delete(timeoutId);
  }

  // Track event listeners for cleanup
  trackEventListener(id: string, target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener);
    this.eventListeners.set(id, { target, type, listener });
  }

  // Remove tracked event listener
  removeEventListener(id: string): void {
    const entry = this.eventListeners.get(id);
    if (entry) {
      entry.target.removeEventListener(entry.type, entry.listener);
      this.eventListeners.delete(id);
    }
  }

  // Clear all tracked resources
  clearAllResources(): void {
    // Clear all intervals
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds.clear();

    // Clear all timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds.clear();

    // Remove all event listeners
    this.eventListeners.forEach((entry, id) => {
      entry.target.removeEventListener(entry.type, entry.listener);
    });
    this.eventListeners.clear();

    // Execute all cleanup functions
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions.clear();
  }

  // Monitor memory usage
  private startMemoryMonitoring(): void {
    if ('performance' in window && 'memory' in (performance as any)) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        
        if (usageRatio > this.memoryWarningThreshold) {
          console.warn('High memory usage detected:', Math.round(usageRatio * 100) + '%');
          this.triggerGarbageCollection();
        }
      };

      const intervalId = setInterval(checkMemory, 30000); // Check every 30 seconds
      this.trackInterval(intervalId);
    }
  }

  // Attempt to trigger garbage collection by clearing caches
  private triggerGarbageCollection(): void {
    // Clear image caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('temp') || name.includes('old')) {
            caches.delete(name);
          }
        });
      });
    }

    // Dispatch memory warning event for components to handle
    window.dispatchEvent(new CustomEvent('memory-warning'));
  }

  // Get current resource usage stats
  getResourceStats(): {
    intervals: number;
    timeouts: number;
    eventListeners: number;
    cleanupFunctions: number;
    memoryUsage?: number;
  } {
    const stats = {
      intervals: this.intervalIds.size,
      timeouts: this.timeoutIds.size,
      eventListeners: this.eventListeners.size,
      cleanupFunctions: this.cleanupFunctions.size,
      memoryUsage: undefined as number | undefined
    };

    if ('performance' in window && 'memory' in (performance as any)) {
      const memory = (performance as any).memory;
      stats.memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }

    return stats;
  }
}

export const resourceManager = ResourceManager.getInstance();
