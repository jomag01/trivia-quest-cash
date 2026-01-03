// CDN and Multi-Region Configuration for 100M+ Users
// Provides edge caching, geographic routing, and asset optimization

export interface CDNConfig {
  primaryCDN: string;
  fallbackCDN?: string;
  regions: Region[];
  cacheHeaders: CachePolicy;
}

export interface Region {
  id: string;
  name: string;
  endpoint: string;
  priority: number;
}

export interface CachePolicy {
  images: number;      // seconds
  videos: number;
  static: number;
  api: number;
  html: number;
}

// Default CDN configuration
const defaultCachePolicy: CachePolicy = {
  images: 31536000,    // 1 year for immutable assets
  videos: 31536000,
  static: 31536000,
  api: 60,             // 1 minute for API responses
  html: 0              // No cache for HTML (always fresh)
};

// Geographic regions for multi-region deployment
const regions: Region[] = [
  { id: 'us-east', name: 'US East', endpoint: 'us-east.cdn.example.com', priority: 1 },
  { id: 'us-west', name: 'US West', endpoint: 'us-west.cdn.example.com', priority: 2 },
  { id: 'eu-west', name: 'Europe', endpoint: 'eu-west.cdn.example.com', priority: 3 },
  { id: 'ap-southeast', name: 'Asia Pacific', endpoint: 'ap-southeast.cdn.example.com', priority: 4 }
];

class CDNHelper {
  private static instance: CDNHelper;
  private config: CDNConfig;
  private nearestRegion: Region | null = null;

  private constructor() {
    this.config = {
      primaryCDN: import.meta.env.VITE_CDN_URL || '',
      fallbackCDN: import.meta.env.VITE_CDN_FALLBACK_URL || '',
      regions,
      cacheHeaders: defaultCachePolicy
    };
    this.detectNearestRegion();
  }

  static getInstance(): CDNHelper {
    if (!CDNHelper.instance) {
      CDNHelper.instance = new CDNHelper();
    }
    return CDNHelper.instance;
  }

  // Detect nearest region based on latency
  private async detectNearestRegion(): Promise<void> {
    if (typeof window === 'undefined') return;

    // Use timezone as a simple heuristic for region
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    if (timezone.includes('America')) {
      if (timezone.includes('Los_Angeles') || timezone.includes('Pacific')) {
        this.nearestRegion = regions.find(r => r.id === 'us-west') || null;
      } else {
        this.nearestRegion = regions.find(r => r.id === 'us-east') || null;
      }
    } else if (timezone.includes('Europe') || timezone.includes('Africa')) {
      this.nearestRegion = regions.find(r => r.id === 'eu-west') || null;
    } else {
      this.nearestRegion = regions.find(r => r.id === 'ap-southeast') || null;
    }
  }

  // Get optimized image URL with CDN and transformations
  getImageURL(originalUrl: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'auto';
  }): string {
    if (!originalUrl) return '';
    
    // If already a CDN URL or data URL, return as-is
    if (originalUrl.startsWith('data:') || originalUrl.includes('cdn.')) {
      return originalUrl;
    }

    // For Supabase storage URLs, use their image transformation
    if (originalUrl.includes('supabase')) {
      const params = new URLSearchParams();
      if (options?.width) params.set('width', options.width.toString());
      if (options?.height) params.set('height', options.height.toString());
      if (options?.quality) params.set('quality', options.quality.toString());
      
      const separator = originalUrl.includes('?') ? '&' : '?';
      return params.toString() ? `${originalUrl}${separator}${params}` : originalUrl;
    }

    return originalUrl;
  }

  // Get cache headers for different content types
  getCacheHeaders(contentType: 'images' | 'videos' | 'static' | 'api' | 'html'): HeadersInit {
    const maxAge = this.config.cacheHeaders[contentType];
    
    if (maxAge === 0) {
      return {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
    }

    return {
      'Cache-Control': `public, max-age=${maxAge}, immutable`,
      'Vary': 'Accept-Encoding'
    };
  }

  // Get nearest region endpoint
  getNearestEndpoint(): string {
    return this.nearestRegion?.endpoint || this.config.regions[0].endpoint;
  }

  // Preload critical assets
  preloadAssets(urls: string[], priority: 'high' | 'low' = 'high'): void {
    if (typeof document === 'undefined') return;

    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = this.getAsType(url);
      if (priority === 'high') {
        link.setAttribute('fetchpriority', 'high');
      }
      document.head.appendChild(link);
    });
  }

  private getAsType(url: string): string {
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(url)) return 'image';
    if (/\.(mp4|webm|ogg)$/i.test(url)) return 'video';
    if (/\.(woff|woff2|ttf|otf)$/i.test(url)) return 'font';
    if (/\.js$/i.test(url)) return 'script';
    if (/\.css$/i.test(url)) return 'style';
    return 'fetch';
  }

  // Add DNS prefetch for CDN domains
  addDNSPrefetch(domains: string[]): void {
    if (typeof document === 'undefined') return;

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);

      // Also add preconnect for critical domains
      const preconnect = document.createElement('link');
      preconnect.rel = 'preconnect';
      preconnect.href = domain;
      preconnect.crossOrigin = 'anonymous';
      document.head.appendChild(preconnect);
    });
  }

  // Get region info
  getRegionInfo(): { region: Region | null; allRegions: Region[] } {
    return {
      region: this.nearestRegion,
      allRegions: this.config.regions
    };
  }
}

export const cdnHelper = CDNHelper.getInstance();

// Responsive image srcset generator
export function generateSrcSet(baseUrl: string, widths: number[] = [320, 640, 768, 1024, 1280, 1920]): string {
  return widths
    .map(w => `${cdnHelper.getImageURL(baseUrl, { width: w })} ${w}w`)
    .join(', ');
}

// Lazy load images with Intersection Observer
export function createImageObserver(
  options: { rootMargin?: string; threshold?: number } = {}
): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;

  return new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
        }
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: options.rootMargin || '50px',
    threshold: options.threshold || 0.01
  });
}
