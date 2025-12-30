// Mobile-specific configuration for native app deployment

export const MOBILE_CONFIG = {
  // API endpoints - using HTTPS for security
  api: {
    baseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://pcsancednuywpxvuruqb.supabase.co',
    functionsUrl: `${import.meta.env.VITE_SUPABASE_URL || 'https://pcsancednuywpxvuruqb.supabase.co'}/functions/v1`,
    storageUrl: `${import.meta.env.VITE_SUPABASE_URL || 'https://pcsancednuywpxvuruqb.supabase.co'}/storage/v1`,
  },
  
  // App identifiers
  app: {
    id: 'app.lovable.c512181307b84e4689a38c4951e10c56',
    name: 'Triviabees',
    version: '1.0.0',
    bundleVersion: 1,
  },
  
  // Deep linking configuration
  deepLinks: {
    scheme: 'triviabees',
    universalLinks: [
      'https://c5121813-07b8-4e46-89a3-8c4951e10c56.lovableproject.com',
    ],
    paths: [
      '/game/*',
      '/shop/*',
      '/ai-hub/*',
      '/profile/*',
      '/auth/*',
    ],
  },
  
  // Safe area insets for notches and home indicators
  safeAreas: {
    top: 'env(safe-area-inset-top, 0px)',
    right: 'env(safe-area-inset-right, 0px)',
    bottom: 'env(safe-area-inset-bottom, 0px)',
    left: 'env(safe-area-inset-left, 0px)',
  },
  
  // Feature flags for mobile
  features: {
    pushNotifications: true,
    biometricAuth: false,
    hapticFeedback: true,
    offlineMode: true,
    backgroundSync: true,
  },
  
  // Network configuration
  network: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
};

// Check if running in native app context
export const isNativeApp = (): boolean => {
  return typeof window !== 'undefined' && 
    (window as any).Capacitor !== undefined;
};

// Check if running as installed PWA
export const isPWA = (): boolean => {
  return typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches ||
     (window.navigator as any).standalone === true);
};

// Get platform info
export const getPlatform = (): 'ios' | 'android' | 'web' => {
  if (typeof window === 'undefined') return 'web';
  
  const capacitor = (window as any).Capacitor;
  if (capacitor?.getPlatform) {
    return capacitor.getPlatform();
  }
  
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
};

// Handle safe area insets
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  
  const computedStyle = getComputedStyle(document.documentElement);
  return {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10),
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10),
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10),
  };
};
