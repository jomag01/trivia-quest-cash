// Connection-Aware Loading for slow connections and 100M+ scale
// Adapts content quality and loading strategy based on network conditions

export type ConnectionQuality = 'slow-2g' | '2g' | '3g' | '4g' | 'fast';

interface ConnectionAwareConfig {
  imageQuality: 'low' | 'medium' | 'high';
  enableAnimations: boolean;
  prefetchEnabled: boolean;
  videosEnabled: boolean;
  autoplayEnabled: boolean;
  maxConcurrentRequests: number;
  imagePlaceholder: 'blur' | 'skeleton' | 'none';
  lazyLoadThreshold: string;
}

const CONNECTION_CONFIGS: Record<ConnectionQuality, ConnectionAwareConfig> = {
  'slow-2g': {
    imageQuality: 'low',
    enableAnimations: false,
    prefetchEnabled: false,
    videosEnabled: false,
    autoplayEnabled: false,
    maxConcurrentRequests: 2,
    imagePlaceholder: 'skeleton',
    lazyLoadThreshold: '500px',
  },
  '2g': {
    imageQuality: 'low',
    enableAnimations: false,
    prefetchEnabled: false,
    videosEnabled: false,
    autoplayEnabled: false,
    maxConcurrentRequests: 3,
    imagePlaceholder: 'skeleton',
    lazyLoadThreshold: '300px',
  },
  '3g': {
    imageQuality: 'medium',
    enableAnimations: true,
    prefetchEnabled: true,
    videosEnabled: true,
    autoplayEnabled: false,
    maxConcurrentRequests: 4,
    imagePlaceholder: 'blur',
    lazyLoadThreshold: '200px',
  },
  '4g': {
    imageQuality: 'high',
    enableAnimations: true,
    prefetchEnabled: true,
    videosEnabled: true,
    autoplayEnabled: true,
    maxConcurrentRequests: 6,
    imagePlaceholder: 'blur',
    lazyLoadThreshold: '100px',
  },
  'fast': {
    imageQuality: 'high',
    enableAnimations: true,
    prefetchEnabled: true,
    videosEnabled: true,
    autoplayEnabled: true,
    maxConcurrentRequests: 10,
    imagePlaceholder: 'none',
    lazyLoadThreshold: '50px',
  },
};

class ConnectionAwareLoader {
  private static instance: ConnectionAwareLoader;
  private currentQuality: ConnectionQuality = '4g';
  private listeners: Set<(config: ConnectionAwareConfig) => void> = new Set();
  private saveDataEnabled = false;
  private config: ConnectionAwareConfig;

  private constructor() {
    this.config = CONNECTION_CONFIGS['4g'];
    this.detectConnection();
    this.setupListeners();
  }

  static getInstance(): ConnectionAwareLoader {
    if (!ConnectionAwareLoader.instance) {
      ConnectionAwareLoader.instance = new ConnectionAwareLoader();
    }
    return ConnectionAwareLoader.instance;
  }

  private detectConnection(): void {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (connection) {
      this.saveDataEnabled = connection.saveData || false;
      const effectiveType = connection.effectiveType as string;
      
      if (this.saveDataEnabled) {
        this.currentQuality = 'slow-2g';
      } else if (effectiveType === 'slow-2g') {
        this.currentQuality = 'slow-2g';
      } else if (effectiveType === '2g') {
        this.currentQuality = '2g';
      } else if (effectiveType === '3g') {
        this.currentQuality = '3g';
      } else if (effectiveType === '4g') {
        this.currentQuality = connection.downlink >= 10 ? 'fast' : '4g';
      } else {
        this.currentQuality = 'fast';
      }
    } else {
      // Fallback: assume moderate connection
      this.currentQuality = '4g';
    }

    this.config = CONNECTION_CONFIGS[this.currentQuality];
    this.notifyListeners();
  }

  private setupListeners(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        this.detectConnection();
      });
    }

    // Detect offline/online
    window.addEventListener('online', () => this.detectConnection());
    window.addEventListener('offline', () => {
      this.currentQuality = 'slow-2g';
      this.config = CONNECTION_CONFIGS['slow-2g'];
      this.notifyListeners();
    });
  }

  getConfig(): ConnectionAwareConfig {
    return this.config;
  }

  getQuality(): ConnectionQuality {
    return this.currentQuality;
  }

  isSaveDataEnabled(): boolean {
    return this.saveDataEnabled;
  }

  isSlowConnection(): boolean {
    return this.currentQuality === 'slow-2g' || this.currentQuality === '2g';
  }

  // Get optimized image URL based on connection
  getOptimizedImageUrl(url: string, width?: number): string {
    if (!url) return url;
    
    const quality = this.config.imageQuality;
    const targetWidth = width || (quality === 'low' ? 400 : quality === 'medium' ? 800 : 1200);
    
    // For Supabase storage URLs
    if (url.includes('supabase.co/storage')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}width=${targetWidth}&quality=${quality === 'low' ? 60 : quality === 'medium' ? 80 : 90}`;
    }
    
    // For CloudFront URLs
    if (url.includes('cloudfront.net')) {
      return url; // CloudFront handles this via query params at CDN level
    }
    
    return url;
  }

  // Should we load this resource based on priority?
  shouldLoad(priority: 'critical' | 'high' | 'medium' | 'low'): boolean {
    const p = priority as string;
    if (p === 'critical') return true;
    if (this.currentQuality === 'slow-2g') return p === 'critical';
    if (this.currentQuality === '2g') return p === 'critical' || p === 'high';
    if (this.currentQuality === '3g') return p !== 'low';
    return true;
  }

  subscribe(listener: (config: ConnectionAwareConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.config); // Immediate callback with current config
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }
}

export const connectionAwareLoader = ConnectionAwareLoader.getInstance();

// React hook for connection-aware loading
export function useConnectionAware() {
  return connectionAwareLoader;
}
