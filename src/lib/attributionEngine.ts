import { supabase } from "@/integrations/supabase/client";
import { 
  getTrackingCookie, 
  getVisitorId, 
  removeTrackingCookie,
  markConversion 
} from "./cookieTracking";

export interface AttributionData {
  affiliateId: string | null;
  referrerId: string | null;
  campaignId: string | null;
  source: string | null;
  medium: string | null;
  visitorId: string;
  attributionType: 'first_touch' | 'last_touch';
}

// ============= Get Current Attribution =============
export const getCurrentAttribution = (): AttributionData => {
  const visitorId = getVisitorId();
  
  // Try affiliate first, then referral
  const affiliateId = getTrackingCookie('affiliate_referrer');
  const referrerId = getTrackingCookie('referral_referrer') || affiliateId;
  
  return {
    affiliateId,
    referrerId,
    campaignId: getTrackingCookie('utm_campaign') || null,
    source: getTrackingCookie('utm_source') || null,
    medium: getTrackingCookie('utm_medium') || null,
    visitorId,
    attributionType: 'first_touch',
  };
};

// ============= Create Attribution Record =============
export const createAttributionRecord = async (
  orderId: string | null,
  userId: string | null,
  revenue: number,
  commission: number = 0,
  metadata: Record<string, any> = {}
): Promise<boolean> => {
  const attribution = getCurrentAttribution();
  
  if (!attribution.referrerId && !attribution.affiliateId) {
    return false; // No attribution to record
  }
  
  try {
    await supabase.from('affiliate_attributions').insert({
      order_id: orderId,
      user_id: userId,
      affiliate_id: attribution.affiliateId || attribution.referrerId,
      referrer_id: attribution.referrerId,
      campaign_id: attribution.campaignId,
      source: attribution.source,
      medium: attribution.medium,
      attribution_type: attribution.attributionType,
      revenue,
      commission,
      metadata: {
        ...metadata,
        visitor_id: attribution.visitorId
      }
    });
    
    // Update campaign metrics
    if (attribution.campaignId) {
      const today = new Date().toISOString().split('T')[0];
      
      // Get existing metrics first
      const { data: existing } = await supabase
        .from('campaign_metrics')
        .select('conversions, revenue, commission_paid')
        .eq('campaign_id', attribution.campaignId)
        .eq('date', today)
        .maybeSingle();
      
      if (existing) {
        // Update with incremented values
        await supabase
          .from('campaign_metrics')
          .update({
            conversions: (existing.conversions || 0) + 1,
            revenue: (Number(existing.revenue) || 0) + revenue,
            commission_paid: (Number(existing.commission_paid) || 0) + commission,
            updated_at: new Date().toISOString()
          })
          .eq('campaign_id', attribution.campaignId)
          .eq('date', today);
      } else {
        // Insert new record
        await supabase.from('campaign_metrics').insert({
          campaign_id: attribution.campaignId,
          date: today,
          conversions: 1,
          revenue,
          commission_paid: commission
        });
      }
    }
    
    // Mark conversion in link_tracking
    await markConversion('affiliate', 'purchase');
    await markConversion('referral', 'purchase');
    
    return true;
  } catch (error) {
    console.error('Error creating attribution record:', error);
    return false;
  }
};

// ============= Clear Attribution (after conversion) =============
export const clearAttribution = (): void => {
  removeTrackingCookie('affiliate_referrer');
  removeTrackingCookie('affiliate_target');
  removeTrackingCookie('referral_referrer');
  removeTrackingCookie('referral_target');
  removeTrackingCookie('utm_source');
  removeTrackingCookie('utm_medium');
  removeTrackingCookie('utm_campaign');
};

// ============= Fraud Detection =============
export const checkFraud = async (
  userId: string,
  referrerId: string
): Promise<{ isFraud: boolean; reason?: string }> => {
  // Self-referral check
  if (userId === referrerId) {
    return { isFraud: true, reason: 'self_referral' };
  }
  
  try {
    const fingerprint = localStorage.getItem('aff_device_fingerprint');
    const visitorId = getVisitorId();
    
    // Check for multiple accounts from same device
    if (fingerprint) {
      const { data: recentAttributions } = await supabase
        .from('affiliate_attributions' as any)
        .select('user_id')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(5);
      
      if (recentAttributions && recentAttributions.length >= 3) {
        const uniqueUsers = new Set((recentAttributions as any[]).map(a => a.user_id));
        if (uniqueUsers.size >= 3) {
          return { isFraud: true, reason: 'multi_account_device' };
        }
      }
    }
    
    // Check cooldown (same visitor converting multiple times)
    const { data: recentConversions } = await supabase
      .from('link_tracking')
      .select('id')
      .eq('visitor_id', visitorId)
      .eq('converted', true)
      .gte('converted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);
    
    if (recentConversions && recentConversions.length > 0) {
      return { isFraud: true, reason: 'cooldown_active' };
    }
  } catch {
    // Fail open for now
  }
  
  return { isFraud: false };
};

// ============= Get Attribution Stats for Affiliate =============
export const getAffiliateStats = async (
  affiliateId: string,
  dateRange?: { start: Date; end: Date }
): Promise<{
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  epc: number;
}> => {
  try {
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateRange?.end || new Date();
    
    // Get clicks
    const { count: clicks } = await supabase
      .from('link_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', affiliateId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    // Get attributions
    const { data: attributions } = await supabase
      .from('affiliate_attributions')
      .select('revenue, commission')
      .eq('affiliate_id', affiliateId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    const conversions = attributions?.length || 0;
    const revenue = attributions?.reduce((sum, a) => sum + (Number(a.revenue) || 0), 0) || 0;
    const commission = attributions?.reduce((sum, a) => sum + (Number(a.commission) || 0), 0) || 0;
    const epc = (clicks && clicks > 0) ? revenue / clicks : 0;
    
    return {
      clicks: clicks || 0,
      conversions,
      revenue,
      commission,
      epc: Math.round(epc * 100) / 100
    };
  } catch {
    return { clicks: 0, conversions: 0, revenue: 0, commission: 0, epc: 0 };
  }
};