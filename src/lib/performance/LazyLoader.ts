// Lazy Loader for 100M+ concurrent users
// Optimized component and image lazy loading

import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Cache for lazy components to prevent re-creation
const componentCache = new Map<string, LazyExoticComponent<any>>();

// Create cached lazy component
export function lazyWithCache<T extends ComponentType<any>>(
  key: string,
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  if (componentCache.has(key)) {
    return componentCache.get(key)!;
  }

  const component = lazy(factory);
  componentCache.set(key, component);
  return component;
}

// Preload a lazy component
export function preloadComponent(
  factory: () => Promise<{ default: any }>
): void {
  // Start loading immediately but don't await
  factory().catch(() => {});
}

// Image lazy loading with placeholder
export interface LazyImageConfig {
  src: string;
  placeholder?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

const imageObserver = typeof window !== 'undefined' 
  ? new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      },
      { rootMargin: '100px', threshold: 0 }
    )
  : null;

export function observeImage(img: HTMLImageElement, src: string): void {
  if (!imageObserver) {
    img.src = src;
    return;
  }

  img.dataset.src = src;
  imageObserver.observe(img);
}

export function unobserveImage(img: HTMLImageElement): void {
  imageObserver?.unobserve(img);
}

// Intersection observer hook for any element
export function createVisibilityObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined') return null;

  return new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, {
    rootMargin: '50px',
    threshold: 0,
    ...options
  });
}

// Preload images for better perceived performance
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

// Batch preload multiple images
export async function preloadImages(srcs: string[], concurrency: number = 3): Promise<void> {
  for (let i = 0; i < srcs.length; i += concurrency) {
    const batch = srcs.slice(i, i + concurrency);
    await Promise.allSettled(batch.map(preloadImage));
  }
}

// Module preloading for faster navigation
const preloadedModules = new Set<string>();

export function preloadModule(moduleFactory: () => Promise<any>, key: string): void {
  if (preloadedModules.has(key)) return;
  
  preloadedModules.add(key);
  
  // Use requestIdleCallback if available for non-blocking preload
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      moduleFactory().catch(() => {
        preloadedModules.delete(key);
      });
    });
  } else {
    setTimeout(() => {
      moduleFactory().catch(() => {
        preloadedModules.delete(key);
      });
    }, 100);
  }
}
