import { useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  parseDeepLink, 
  resolveDeepLink, 
  storeDeepLinkForResume,
  resumeDeepLink,
  preloadEntityMetadata,
  type DeepLink,
  type TrackingParams
} from "@/lib/deepLinking";
import {
  getVisitorId,
  setTrackingCookie,
  getTrackingCookie,
  getCookieSettings,
} from "@/lib/cookieTracking";

// Generate device fingerprint (basic version)
const generateFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('triviabees', 2, 2);
  }
  const canvasData = canvas.toDataURL();
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvasData.slice(-50)
  ].join('|');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Get platform
const getPlatform = (): string => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/tablet/.test(ua)) return 'tablet';
  return 'web';
};

// Track deep link visit with full UTM support
const trackDeepLinkVisit = async (
  deepLink: DeepLink | null,
  tracking: TrackingParams
): Promise<void> => {
  if (!deepLink && !tracking.ref && !tracking.aff) return;
  
  try {
    const settings = await getCookieSettings();
    const visitorId = getVisitorId();
    const fingerprint = generateFingerprint();
    const platform = getPlatform();
    
    // Determine link type
    let linkType = 'referral';
    let referrerId: string | null = null;
    
    if (tracking.aff) {
      linkType = 'affiliate';
      referrerId = tracking.aff;
    } else if (tracking.ref) {
      // Look up referrer by code
      const { data: referrer } = await supabase
        .from('profiles')
        .select('id')
        .or(`referral_code.eq.${tracking.ref},id.eq.${tracking.ref}`)
        .maybeSingle();
      
      if (referrer) {
        referrerId = referrer.id;
      }
    }
    
    if (!referrerId) return;
    
    // Check for self-referral prevention
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === referrerId) {
      console.log('Self-referral prevented');
      return;
    }
    
    // Check first-touch rule - only set if no existing cookie
    const existingRef = getTrackingCookie('referral_referrer') || getTrackingCookie('affiliate_referrer');
    if (existingRef && existingRef !== referrerId) {
      // First-touch wins - don't overwrite unless campaign allows
      const allowOverride = tracking.cmp?.includes('override');
      if (!allowOverride) {
        console.log('First-touch preserved, skipping overwrite');
        // Still track the click for analytics
      } else {
        // Update cookies with new referrer
        setTrackingCookie(`${linkType}_referrer`, referrerId, settings.cookieDurationDays);
      }
    } else {
      // Set cookies
      setTrackingCookie(`${linkType}_referrer`, referrerId, settings.cookieDurationDays);
    }
    
    // Store in IndexedDB for mobile resilience (fallback)
    try {
      localStorage.setItem('aff_tracking_backup', JSON.stringify({
        referrerId,
        linkType,
        tracking,
        timestamp: Date.now()
      }));
    } catch { /* ignore */ }
    
    // Set target if available
    if (deepLink?.entityId) {
      setTrackingCookie(`${linkType}_target`, deepLink.entityId, settings.cookieDurationDays);
    }
    
    // Store UTM params separately for easy access
    if (tracking.utm_source) setTrackingCookie('utm_source', tracking.utm_source, settings.cookieDurationDays);
    if (tracking.utm_medium) setTrackingCookie('utm_medium', tracking.utm_medium, settings.cookieDurationDays);
    if (tracking.utm_campaign) setTrackingCookie('utm_campaign', tracking.utm_campaign, settings.cookieDurationDays);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + settings.cookieDurationDays);
    
    // Insert tracking record with full UTM data
    await supabase.from('link_tracking').insert({
      visitor_id: visitorId,
      link_type: linkType,
      referrer_id: referrerId,
      target_id: deepLink?.entityId || null,
      source_url: window.location.href,
      user_agent: navigator.userAgent,
      expires_at: expiresAt.toISOString(),
      utm_source: tracking.utm_source || null,
      utm_medium: tracking.utm_medium || null,
      utm_campaign: tracking.utm_campaign || null,
      utm_content: tracking.utm_content || null,
      utm_term: tracking.utm_term || null,
      src: tracking.src || null,
      cmp: tracking.cmp || null,
      device_fingerprint: fingerprint,
      platform
    });
    
    // Update campaign metrics if campaign specified
    if (tracking.cmp || tracking.utm_campaign) {
      const campaignId = tracking.cmp || tracking.utm_campaign;
      const today = new Date().toISOString().split('T')[0];
      
      // Try upsert for campaign metrics
      await supabase.from('campaign_metrics')
        .upsert({
          campaign_id: campaignId,
          date: today,
          clicks: 1,
          unique_visitors: 1
        }, { 
          onConflict: 'campaign_id,date',
          ignoreDuplicates: false 
        });
    }
  } catch (error) {
    console.error('Error tracking deep link:', error);
  }
};

export const useDeepLinkTracking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const processedRef = useRef(false);
  
  const processDeepLink = useCallback(async () => {
    // Only process once per page load
    if (processedRef.current) return;
    
    const urlParams = new URLSearchParams(location.search);
    
    // Extract all tracking params
    const tracking: TrackingParams = {
      ref: urlParams.get('ref') || undefined,
      aff: urlParams.get('aff') || undefined,
      src: urlParams.get('src') || undefined,
      cmp: urlParams.get('cmp') || undefined,
      utm_source: urlParams.get('utm_source') || undefined,
      utm_medium: urlParams.get('utm_medium') || undefined,
      utm_campaign: urlParams.get('utm_campaign') || undefined,
      utm_content: urlParams.get('utm_content') || undefined,
      utm_term: urlParams.get('utm_term') || undefined,
    };
    
    // Check if there's any tracking to do
    const hasTracking = Object.values(tracking).some(v => v);
    
    // Parse deep link
    const deepLink = parseDeepLink();
    
    if (hasTracking) {
      processedRef.current = true;
      await trackDeepLinkVisit(deepLink, tracking);
    }
    
    // Check for resumed deep link (after app install)
    const resumedLink = resumeDeepLink();
    if (resumedLink && resumedLink.entityType && resumedLink.entityId) {
      const targetPath = resolveDeepLink(resumedLink.entityType, resumedLink.entityId);
      if (targetPath !== location.pathname + location.search) {
        navigate(targetPath);
      }
    }
  }, [location.search, location.pathname, navigate]);
  
  useEffect(() => {
    processDeepLink();
  }, [processDeepLink]);
  
  // Reset processed flag when search params change
  useEffect(() => {
    processedRef.current = false;
  }, [location.search]);
  
  return {
    parseDeepLink,
    resolveDeepLink,
    storeDeepLinkForResume,
    preloadEntityMetadata,
  };
};