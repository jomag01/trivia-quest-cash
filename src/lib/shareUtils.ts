import { supabase } from '@/integrations/supabase/client';

interface ShareConfig {
  title: string;
  description: string;
  path: string;
  params?: Record<string, string>;
}

/**
 * Generates a share URL with affiliate referral code embedded
 */
export const generateShareUrl = async (config: ShareConfig): Promise<string> => {
  const { path, params = {} } = config;
  const baseUrl = window.location.origin;
  
  // Get current user for affiliate link
  const { data: { user } } = await supabase.auth.getUser();
  
  // Build URL with params
  const urlParams = new URLSearchParams();
  
  // Add custom params
  Object.entries(params).forEach(([key, value]) => {
    urlParams.set(key, value);
  });
  
  // Add referral code if user is logged in
  if (user) {
    urlParams.set('ref', user.id);
  }
  
  const queryString = urlParams.toString();
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Synchronous version that uses cached user
 */
export const generateShareUrlSync = (
  path: string, 
  userId?: string | null, 
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
  
  // Add referral code if user is logged in
  if (userId) {
    urlParams.set('ref', userId);
  }
  
  const queryString = urlParams.toString();
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
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
