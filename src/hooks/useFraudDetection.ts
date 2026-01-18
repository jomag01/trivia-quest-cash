import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FraudSignal {
  type: string;
  score: number;
  evidence: Record<string, any>;
}

const getVisitorId = (): string => {
  return localStorage.getItem('tb_visitor_id') || '';
};

export const useFraudDetection = () => {
  // Detect rapid clicking behavior
  const detectRapidClicks = useCallback(async (
    sponsoredProductId: string,
    windowMs: number = 60000 // 1 minute window
  ): Promise<FraudSignal | null> => {
    const visitorId = getVisitorId();
    const windowStart = new Date(Date.now() - windowMs);

    const { count } = await supabase
      .from('ad_impression_details')
      .select('*', { count: 'exact', head: true })
      .eq('sponsored_product_id', sponsoredProductId)
      .eq('visitor_id', visitorId)
      .eq('is_clicked', true)
      .gte('created_at', windowStart.toISOString());

    if (count && count > 5) {
      return {
        type: 'rapid_clicks',
        score: Math.min(count / 5 * 0.3, 1.0),
        evidence: {
          clicks_in_window: count,
          window_seconds: windowMs / 1000,
          visitor_id: visitorId,
        },
      };
    }

    return null;
  }, []);

  // Detect self-clicking (seller clicking own ads)
  const detectSelfClick = useCallback(async (
    sponsoredProductId: string,
    userId?: string
  ): Promise<FraudSignal | null> => {
    if (!userId) return null;

    const { data: sponsoredProduct } = await supabase
      .from('sponsored_products')
      .select('seller_id')
      .eq('id', sponsoredProductId)
      .single();

    if (sponsoredProduct?.seller_id === userId) {
      return {
        type: 'self_click',
        score: 1.0,
        evidence: {
          seller_id: userId,
          sponsored_product_id: sponsoredProductId,
        },
      };
    }

    return null;
  }, []);

  // Detect suspicious IP patterns
  const detectIPAnomaly = useCallback(async (
    visitorId: string,
    windowHours: number = 24
  ): Promise<FraudSignal | null> => {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - windowHours);

    // Count unique ad interactions from this visitor
    const { count: clickCount } = await supabase
      .from('ad_impression_details')
      .select('*', { count: 'exact', head: true })
      .eq('visitor_id', visitorId)
      .eq('is_clicked', true)
      .gte('created_at', windowStart.toISOString());

    // If more than 50 clicks in 24 hours, flag as suspicious
    if (clickCount && clickCount > 50) {
      return {
        type: 'high_click_volume',
        score: Math.min(clickCount / 100, 1.0),
        evidence: {
          click_count: clickCount,
          window_hours: windowHours,
          visitor_id: visitorId,
        },
      };
    }

    return null;
  }, []);

  // Check impression cap
  const checkImpressionCap = useCallback(async (
    sponsoredProductId: string,
    frequencyCap: number = 3
  ): Promise<boolean> => {
    const visitorId = getVisitorId();
    const today = new Date().toISOString().split('T')[0];

    const { data: capData } = await supabase
      .from('ad_impression_caps')
      .select('impressions_today, cap_reached')
      .eq('sponsored_product_id', sponsoredProductId)
      .eq('visitor_id', visitorId)
      .single();

    if (capData?.cap_reached) {
      return false; // Cap already reached, don't show ad
    }

    if (capData && capData.impressions_today >= frequencyCap) {
      // Update cap reached flag
      await supabase
        .from('ad_impression_caps')
        .update({ cap_reached: true })
        .eq('sponsored_product_id', sponsoredProductId)
        .eq('visitor_id', visitorId);
      return false;
    }

    return true; // Can show ad
  }, []);

  // Update impression cap counter
  const updateImpressionCap = useCallback(async (
    sponsoredProductId: string
  ): Promise<void> => {
    const visitorId = getVisitorId();

    await supabase.from('ad_impression_caps').upsert({
      sponsored_product_id: sponsoredProductId,
      visitor_id: visitorId,
      impressions_today: 1,
      last_impression_at: new Date().toISOString(),
      cap_reached: false,
    }, {
      onConflict: 'sponsored_product_id,visitor_id',
      ignoreDuplicates: false,
    });

    // Increment if exists
    const { data: existing } = await supabase
      .from('ad_impression_caps')
      .select('impressions_today')
      .eq('sponsored_product_id', sponsoredProductId)
      .eq('visitor_id', visitorId)
      .single();

    if (existing) {
      await supabase
        .from('ad_impression_caps')
        .update({
          impressions_today: (existing.impressions_today || 0) + 1,
          last_impression_at: new Date().toISOString(),
        })
        .eq('sponsored_product_id', sponsoredProductId)
        .eq('visitor_id', visitorId);
    }
  }, []);

  // Main fraud check before recording a click
  const validateClick = useCallback(async (
    sponsoredProductId: string,
    userId?: string
  ): Promise<{ valid: boolean; fraudSignals: FraudSignal[] }> => {
    const fraudSignals: FraudSignal[] = [];

    // Check self-click
    const selfClick = await detectSelfClick(sponsoredProductId, userId);
    if (selfClick) fraudSignals.push(selfClick);

    // Check rapid clicks
    const rapidClicks = await detectRapidClicks(sponsoredProductId);
    if (rapidClicks) fraudSignals.push(rapidClicks);

    // Check high volume
    const visitorId = getVisitorId();
    const ipAnomaly = await detectIPAnomaly(visitorId);
    if (ipAnomaly) fraudSignals.push(ipAnomaly);

    // Calculate total fraud score
    const totalScore = fraudSignals.reduce((sum, s) => sum + s.score, 0);
    const isValid = totalScore < 0.7; // Threshold for blocking

    // Log fraud detection if signals found
    if (fraudSignals.length > 0) {
      const evidenceData = JSON.parse(JSON.stringify({ signals: fraudSignals }));
      await supabase.from('ad_fraud_detection').insert([{
        user_id: userId || null,
        fraud_type: fraudSignals.map(s => s.type).join(','),
        fraud_score: totalScore,
        is_blocked: !isValid,
        evidence: evidenceData,
      }]);
    }

    return { valid: isValid, fraudSignals };
  }, [detectSelfClick, detectRapidClicks, detectIPAnomaly]);

  // Get fraud alerts for admin
  const getFraudAlerts = useCallback(async (limit: number = 50) => {
    const { data } = await supabase
      .from('ad_fraud_detection')
      .select('*')
      .order('detected_at', { ascending: false })
      .limit(limit);

    return data || [];
  }, []);

  // Mark fraud as reviewed
  const reviewFraud = useCallback(async (
    fraudId: string,
    action: 'dismiss' | 'block' | 'warn',
    reviewerId: string
  ) => {
    await supabase
      .from('ad_fraud_detection')
      .update({
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        review_action: action,
        is_blocked: action === 'block',
      })
      .eq('id', fraudId);
  }, []);

  return {
    detectRapidClicks,
    detectSelfClick,
    detectIPAnomaly,
    checkImpressionCap,
    updateImpressionCap,
    validateClick,
    getFraudAlerts,
    reviewFraud,
  };
};
