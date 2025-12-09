import { supabase } from "@/integrations/supabase/client";

const COOKIE_PREFIX = 'aff_';
const VISITOR_ID_KEY = 'aff_visitor_id';

// Generate a unique visitor ID
const generateVisitorId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
};

// Get or create visitor ID
export const getVisitorId = (): string => {
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
};

// Set a tracking cookie
export const setTrackingCookie = (
  name: string, 
  value: string, 
  days: number
): void => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${COOKIE_PREFIX}${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
};

// Get a tracking cookie
export const getTrackingCookie = (name: string): string | null => {
  const cookieName = `${COOKIE_PREFIX}${name}=`;
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(cookieName) === 0) {
      return decodeURIComponent(cookie.substring(cookieName.length));
    }
  }
  return null;
};

// Remove a tracking cookie
export const removeTrackingCookie = (name: string): void => {
  document.cookie = `${COOKIE_PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

// Get cookie settings from admin
export const getCookieSettings = async (): Promise<{
  cookieDurationDays: number;
  trackReferralLinks: boolean;
  trackProductLinks: boolean;
  trackAffiliateLinks: boolean;
}> => {
  const { data } = await supabase
    .from('treasure_admin_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'cookie_duration_days',
      'track_referral_links',
      'track_product_links',
      'track_affiliate_links'
    ]);

  const settings = {
    cookieDurationDays: 90,
    trackReferralLinks: true,
    trackProductLinks: true,
    trackAffiliateLinks: true
  };

  if (data) {
    for (const item of data) {
      switch (item.setting_key) {
        case 'cookie_duration_days':
          settings.cookieDurationDays = Math.min(90, parseInt(item.setting_value) || 90);
          break;
        case 'track_referral_links':
          settings.trackReferralLinks = item.setting_value === 'true';
          break;
        case 'track_product_links':
          settings.trackProductLinks = item.setting_value === 'true';
          break;
        case 'track_affiliate_links':
          settings.trackAffiliateLinks = item.setting_value === 'true';
          break;
      }
    }
  }

  return settings;
};

// Track a link visit
export const trackLinkVisit = async (
  linkType: 'referral' | 'product' | 'affiliate' | 'live_stream',
  referrerId: string,
  targetId?: string
): Promise<void> => {
  try {
    const settings = await getCookieSettings();
    
    // Check if tracking is enabled for this link type
    if (linkType === 'referral' && !settings.trackReferralLinks) return;
    if (linkType === 'product' && !settings.trackProductLinks) return;
    if ((linkType === 'affiliate' || linkType === 'live_stream') && !settings.trackAffiliateLinks) return;

    const visitorId = getVisitorId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.cookieDurationDays);

    // Set cookies
    setTrackingCookie(`${linkType}_referrer`, referrerId, settings.cookieDurationDays);
    if (targetId) {
      setTrackingCookie(`${linkType}_target`, targetId, settings.cookieDurationDays);
    }

    // Store in database for analytics
    await supabase.from('link_tracking').insert({
      visitor_id: visitorId,
      link_type: linkType,
      referrer_id: referrerId,
      target_id: targetId || null,
      source_url: window.location.href,
      user_agent: navigator.userAgent,
      expires_at: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('Error tracking link visit:', error);
  }
};

// Get referrer from cookie
export const getReferrerFromCookie = (
  linkType: 'referral' | 'product' | 'affiliate' | 'live_stream'
): { referrerId: string | null; targetId: string | null } => {
  return {
    referrerId: getTrackingCookie(`${linkType}_referrer`),
    targetId: getTrackingCookie(`${linkType}_target`)
  };
};

// Mark a conversion
export const markConversion = async (
  linkType: 'referral' | 'product' | 'affiliate' | 'live_stream',
  conversionType: string
): Promise<void> => {
  try {
    const visitorId = getVisitorId();
    const referrerData = getReferrerFromCookie(linkType);
    
    if (!referrerData.referrerId) return;

    // Update the most recent tracking record for this visitor
    await supabase
      .from('link_tracking')
      .update({
        converted: true,
        converted_at: new Date().toISOString(),
        conversion_type: conversionType
      })
      .eq('visitor_id', visitorId)
      .eq('link_type', linkType)
      .eq('referrer_id', referrerData.referrerId)
      .is('converted', false);

    // Clear the cookies after conversion
    removeTrackingCookie(`${linkType}_referrer`);
    removeTrackingCookie(`${linkType}_target`);
  } catch (error) {
    console.error('Error marking conversion:', error);
  }
};

// Parse URL for referral parameters and track automatically
export const parseAndTrackFromUrl = async (): Promise<void> => {
  const urlParams = new URLSearchParams(window.location.search);
  
  // Check for referral code
  const refCode = urlParams.get('ref');
  if (refCode) {
    // Look up referrer by code
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', refCode)
      .maybeSingle();
    
    if (referrer) {
      await trackLinkVisit('referral', referrer.id);
    }
  }

  // Check for product referral
  const productRef = urlParams.get('pref');
  const productId = urlParams.get('product');
  if (productRef) {
    await trackLinkVisit('product', productRef, productId || undefined);
  }

  // Check for affiliate link
  const affRef = urlParams.get('aff');
  if (affRef) {
    await trackLinkVisit('affiliate', affRef);
  }

  // Check for live stream referral
  const streamRef = urlParams.get('sref');
  const streamId = urlParams.get('stream');
  if (streamRef) {
    await trackLinkVisit('live_stream', streamRef, streamId || undefined);
  }
};
