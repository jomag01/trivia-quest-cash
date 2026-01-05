import { supabase } from "@/integrations/supabase/client";

// ============= Types =============
export interface DeepLinkConfig {
  entityType: string;
  pathPattern: string;
  preloadMetadata?: boolean;
  requiresAuth?: boolean;
}

export interface TrackingParams {
  ref?: string;      // Referral code (user_id or referral_code)
  aff?: string;      // Affiliate ID
  src?: string;      // Source (e.g., social, email, ads)
  cmp?: string;      // Campaign ID
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface DeepLink {
  entityType: string;
  entityId: string;
  path: string;
  fullUrl: string;
  tracking: TrackingParams;
}

// ============= Deep Link Path Mappings =============
export const ENTITY_PATHS: Record<string, string> = {
  product: '/shop',
  shop: '/shop',
  profile: '/profile',
  feed: '/feed',
  auction: '/auction',
  service: '/booking',
  restaurant: '/food',
  blog: '/blog',
  live: '/live',
  campaign: '/campaign',
  post: '/feed',
};

// ============= Generate Deep Link =============
export const generateDeepLink = async (
  entityType: string,
  entityId: string,
  customParams?: Record<string, string>
): Promise<string> => {
  const baseUrl = window.location.origin;
  const path = ENTITY_PATHS[entityType] || `/${entityType}`;
  
  // Get current user for referral
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get user's referral code if available
  let refCode = user?.id;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.referral_code) {
      refCode = profile.referral_code;
    }
  }
  
  const params = new URLSearchParams();
  
  // Add entity-specific param
  params.set(entityType, entityId);
  
  // Add referral if user is logged in
  if (refCode) {
    params.set('ref', refCode);
  }
  
  // Add custom params
  if (customParams) {
    Object.entries(customParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  
  return `${baseUrl}${path}?${params.toString()}`;
};

// ============= Generate Deep Link Sync =============
export const generateDeepLinkSync = (
  entityType: string,
  entityId: string,
  userId?: string | null,
  referralCode?: string | null,
  customParams?: Record<string, string>
): string => {
  const baseUrl = window.location.origin;
  const path = ENTITY_PATHS[entityType] || `/${entityType}`;
  
  const params = new URLSearchParams();
  
  // Add entity-specific param
  params.set(entityType, entityId);
  
  // Add referral - prefer referral_code over user_id
  if (referralCode) {
    params.set('ref', referralCode);
  } else if (userId) {
    params.set('ref', userId);
  }
  
  // Add custom params
  if (customParams) {
    Object.entries(customParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  
  return `${baseUrl}${path}?${params.toString()}`;
};

// ============= Parse Deep Link =============
export const parseDeepLink = (url?: string): DeepLink | null => {
  try {
    const urlObj = new URL(url || window.location.href);
    const params = urlObj.searchParams;
    
    // Extract tracking params
    const tracking: TrackingParams = {
      ref: params.get('ref') || undefined,
      aff: params.get('aff') || undefined,
      src: params.get('src') || undefined,
      cmp: params.get('cmp') || undefined,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
    };
    
    // Determine entity type from path or params
    const path = urlObj.pathname;
    let entityType = '';
    let entityId = '';
    
    // Check for entity params
    for (const [type] of Object.entries(ENTITY_PATHS)) {
      const id = params.get(type);
      if (id) {
        entityType = type;
        entityId = id;
        break;
      }
    }
    
    // Fallback: try to extract from path
    if (!entityType) {
      const pathMatch = path.match(/\/(\w+)\/([^/?]+)/);
      if (pathMatch) {
        const [, possibleType, id] = pathMatch;
        if (ENTITY_PATHS[possibleType]) {
          entityType = possibleType;
          entityId = id;
        }
      }
    }
    
    if (!entityType) return null;
    
    return {
      entityType,
      entityId,
      path,
      fullUrl: url || window.location.href,
      tracking,
    };
  } catch {
    return null;
  }
};

// ============= Resolve Deep Link to actual page =============
export const resolveDeepLink = (entityType: string, entityId: string): string => {
  const path = ENTITY_PATHS[entityType];
  if (!path) return '/';
  
  // Build the query string with the entity param
  const params = new URLSearchParams();
  params.set(entityType, entityId);
  
  return `${path}?${params.toString()}`;
};

// ============= Store deep link data for post-install resume =============
export const storeDeepLinkForResume = (deepLink: DeepLink): void => {
  try {
    localStorage.setItem('pending_deep_link', JSON.stringify(deepLink));
    sessionStorage.setItem('pending_deep_link', JSON.stringify(deepLink));
  } catch {
    // Storage not available
  }
};

// ============= Resume deep link after app install =============
export const resumeDeepLink = (): DeepLink | null => {
  try {
    const stored = localStorage.getItem('pending_deep_link') || 
                   sessionStorage.getItem('pending_deep_link');
    if (stored) {
      localStorage.removeItem('pending_deep_link');
      sessionStorage.removeItem('pending_deep_link');
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return null;
};

// ============= Preload entity metadata for SEO/preview =============
export const preloadEntityMetadata = async (
  entityType: string,
  entityId: string
): Promise<{ title?: string; description?: string; image?: string } | null> => {
  try {
    switch (entityType) {
      case 'product': {
        const { data } = await supabase
          .from('products')
          .select('name, description, image_url')
          .eq('id', entityId)
          .maybeSingle();
        if (data) {
          return { title: data.name, description: data.description, image: data.image_url };
        }
        break;
      }
      case 'auction': {
        const { data } = await supabase
          .from('auctions')
          .select('title, description, images')
          .eq('id', entityId)
          .maybeSingle();
        if (data) {
          return { 
            title: data.title, 
            description: data.description, 
            image: data.images?.[0] 
          };
        }
        break;
      }
      case 'blog': {
        const { data } = await supabase
          .from('blog_posts')
          .select('title, excerpt, featured_image')
          .eq('id', entityId)
          .maybeSingle();
        if (data) {
          return { title: data.title, description: data.excerpt, image: data.featured_image };
        }
        break;
      }
      case 'restaurant': {
        const { data } = await supabase
          .from('restaurants' as any)
          .select('name, description, image_url')
          .eq('id', entityId)
          .maybeSingle();
        if (data) {
          const d = data as any;
          return { title: d.name, description: d.description, image: d.image_url };
        }
        break;
      }
      case 'service': {
        const { data } = await supabase
          .from('booking_services' as any)
          .select('name, description, images')
          .eq('id', entityId)
          .maybeSingle();
        if (data) {
          const d = data as any;
          return { 
            title: d.name, 
            description: d.description, 
            image: d.images?.[0] 
          };
        }
        break;
      }
    }
  } catch {
    // Fail silently
  }
  return null;
};