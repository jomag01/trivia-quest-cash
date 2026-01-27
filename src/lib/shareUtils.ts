import { supabase } from '@/integrations/supabase/client';
import { generateDeepLinkSync, ENTITY_PATHS } from './deepLinking';

interface ShareConfig {
  title: string;
  description: string;
  path: string;
  params?: Record<string, string>;
  entityType?: string;
  entityId?: string;
}

/**
 * Generates a share URL with affiliate referral code and UTM params embedded
 */
export const generateShareUrl = async (config: ShareConfig): Promise<string> => {
  const { path, params = {}, entityType, entityId } = config;
  const baseUrl = window.location.origin;
  
  // Get current user for affiliate link
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
  
  // Build URL with params
  const urlParams = new URLSearchParams();
  
  // Add entity-specific param if provided
  if (entityType && entityId) {
    urlParams.set(entityType, entityId);
  }
  
  // Add custom params
  Object.entries(params).forEach(([key, value]) => {
    urlParams.set(key, value);
  });
  
  // Add referral code if user is logged in
  if (refCode) {
    urlParams.set('ref', refCode);
  }
  
  // Add source tracking
  urlParams.set('src', 'share');
  
  const queryString = urlParams.toString();
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Synchronous version that uses cached user
 */
export const generateShareUrlSync = (
  path: string, 
  userId?: string | null,
  referralCode?: string | null,
  params?: Record<string, string>
): string => {
  const baseUrl = window.location.origin;
  const urlParams = new URLSearchParams();
  
  // Add custom params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, value);
    });
  }
  
  // Add referral code - prefer referral_code over user_id
  if (referralCode) {
    urlParams.set('ref', referralCode);
  } else if (userId) {
    urlParams.set('ref', userId);
  }
  
  // Add source tracking
  urlParams.set('src', 'share');
  
  const queryString = urlParams.toString();
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Generate entity-specific share URL (product, auction, service, etc.)
 */
export const generateEntityShareUrl = (
  entityType: string,
  entityId: string,
  userId?: string | null,
  referralCode?: string | null,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): string => {
  const customParams: Record<string, string> = {
    src: 'share'
  };
  
  if (utmParams?.source) customParams.utm_source = utmParams.source;
  if (utmParams?.medium) customParams.utm_medium = utmParams.medium;
  if (utmParams?.campaign) customParams.utm_campaign = utmParams.campaign;
  
  return generateDeepLinkSync(entityType, entityId, userId, referralCode, customParams);
};

/**
 * Share to various social platforms
 */
export const shareToSocialMedia = {
  facebook: (url: string, text?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const quote = text ? `&quote=${encodeURIComponent(text)}` : '';
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}${quote}`, '_blank', 'width=600,height=500');
  },
  
  twitter: (url: string, text?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = text ? encodeURIComponent(text) : '';
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank', 'width=600,height=500');
  },
  
  whatsapp: (url: string, text?: string) => {
    const fullText = text ? `${text}\n${url}` : url;
    // Use mobile-friendly WhatsApp URL
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `whatsapp://send?text=${encodeURIComponent(fullText)}`;
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(fullText)}`, '_blank', 'width=600,height=500');
    }
  },
  
  telegram: (url: string, text?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = text ? encodeURIComponent(text) : '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `tg://msg_url?url=${encodedUrl}&text=${encodedText}`;
    } else {
      window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank', 'width=600,height=500');
    }
  },
  
  messenger: (url: string, text?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // Use mobile deep link for Messenger app
      window.location.href = `fb-messenger://share?link=${encodedUrl}`;
      // Fallback after a short delay if app doesn't open
      setTimeout(() => {
        // If still on page, fallback to m.me link sharing
        window.open(`https://m.me/?link=${encodedUrl}`, '_blank');
      }, 1500);
    } else {
      // Desktop: use Facebook share dialog which works more reliably
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodeURIComponent(text || 'Check this out!')}`, '_blank', 'width=600,height=500');
    }
  },
  
  linkedin: (url: string, title?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}${titleParam}`, '_blank', 'width=600,height=500');
  },
  
  tiktok: (url: string) => {
    // TikTok doesn't have a direct share URL, copy to clipboard for bio links
    navigator.clipboard.writeText(url);
    return true;
  },
  
  native: async (url: string, title: string, text?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },
  
  copyToClipboard: async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Generate a proper product permalink with referral tracking
 */
export const generateProductShareUrl = (
  productId: string,
  referralCode?: string | null,
  utmParams?: { source?: string; medium?: string; campaign?: string }
): string => {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams();
  
  // Add product ID
  params.set('product', productId);
  
  // Add referral code
  if (referralCode) {
    params.set('ref', referralCode);
  }
  
  // Add source tracking
  params.set('src', 'share');
  
  // Add UTM params
  if (utmParams?.source) params.set('utm_source', utmParams.source);
  if (utmParams?.medium) params.set('utm_medium', utmParams.medium);
  if (utmParams?.campaign) params.set('utm_campaign', utmParams.campaign);
  
  return `${baseUrl}/shop?${params.toString()}`;
};

/**
 * Generate share URL that uses the share-preview edge function for proper OG meta tags
 * This ensures social media platforms show the product image in link previews
 */
export const generateSocialShareUrl = (
  entityType: 'product' | 'auction' | 'restaurant' | 'marketplace' | 'service',
  entityId: string,
  referralCode?: string | null
): string => {
  // Use the edge function URL for social sharing
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pcsancednuywpxvuruqb.supabase.co';
  const params = new URLSearchParams();
  
  params.set('type', entityType);
  params.set('id', entityId);
  if (referralCode) params.set('ref', referralCode);
  params.set('src', 'share');
  
  return `${supabaseUrl}/functions/v1/share-preview?${params.toString()}`;
};

/**
 * Generate QR code URL for sharing
 */
export const generateQRCodeUrl = (shareUrl: string, size: number = 200): string => {
  const encodedUrl = encodeURIComponent(shareUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
};
