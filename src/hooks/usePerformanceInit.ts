// Performance initialization hook - call once at app startup
import { useEffect } from 'react';
import { connectionAwareLoader } from '@/lib/performance/ConnectionAwareLoader';
import { bandwidthDetector } from '@/lib/performance/BandwidthDetector';
import { memoryOptimizer } from '@/lib/performance/MemoryOptimizer';

export function usePerformanceInit() {
  useEffect(() => {
    // Start bandwidth monitoring
    bandwidthDetector.startMonitoring(60000); // Check every minute
    
    // Log initial connection quality
    const quality = connectionAwareLoader.getQuality();
    console.log(`[Performance] Connection quality: ${quality}`);
    
    // Subscribe to connection changes
    const unsubscribe = connectionAwareLoader.subscribe(config => {
      console.log(`[Performance] Config updated:`, {
        imageQuality: config.imageQuality,
        enableAnimations: config.enableAnimations,
        maxConcurrentRequests: config.maxConcurrentRequests,
      });
    });

    // Memory optimization for mobile devices
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      if (memInfo?.usedJSHeapSize > 200 * 1024 * 1024) {
        console.log('[Performance] High memory usage detected, optimizing...');
        memoryOptimizer.aggressiveCleanup();
      }
    }

    // Prefetch critical routes when idle
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        // Prefetch next likely pages
        const links = ['/shop', '/dashboard', '/feed'];
        links.forEach(href => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = href;
          document.head.appendChild(link);
        });
      });
    }

    return () => {
      unsubscribe();
      bandwidthDetector.stopMonitoring();
    };
  }, []);
}
