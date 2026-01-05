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
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}${quote}`, '_blank');
  },
  
  twitter: (url: string, text?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = text ? encodeURIComponent(text) : '';
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank');
  },
  
  whatsapp: (url: string, text?: string) => {
    const fullText = text ? `${text}\n${url}` : url;
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank');
  },
  
  telegram: (url: string, text?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = text ? encodeURIComponent(text) : '';
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
  },
  
  messenger: (url: string) => {
    const encodedUrl = encodeURIComponent(url);
    window.open(
      `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=966242223397117&redirect_uri=${encodeURIComponent(window.location.href)}`,
      '_blank',
      'width=600,height=500'
    );
  },
  
  linkedin: (url: string, title?: string) => {
    const encodedUrl = encodeURIComponent(url);
    const titleParam = title ? `&title=${encodeURIComponent(title)}` : '';
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}${titleParam}`, '_blank');
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
 * Generate QR code URL for sharing
 */
export const generateQRCodeUrl = (shareUrl: string, size: number = 200): string => {
  const encodedUrl = encodeURIComponent(shareUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
};
