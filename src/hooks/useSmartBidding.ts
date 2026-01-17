import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceData {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
}

export const useSmartBidding = () => {
  const { user } = useAuth();

  const calculateROAS = (revenue: number, spend: number): number => {
    if (spend <= 0) return 0;
    return revenue / spend;
  };

  const getPerformanceMetrics = useCallback(async (
    sponsoredProductId: string,
    days: number = 7
  ): Promise<PerformanceData> => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data } = await supabase
      .from('ad_daily_analytics')
      .select('impressions, clicks, conversions, spend, revenue')
      .eq('sponsored_product_id', sponsoredProductId)
      .gte('analytics_date', startDate.toISOString().split('T')[0]);

    if (!data?.length) {
      return { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 };
    }

    return data.reduce((acc, row) => ({
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      conversions: acc.conversions + (row.conversions || 0),
      spend: acc.spend + (row.spend || 0),
      revenue: acc.revenue + (row.revenue || 0),
    }), { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 });
  }, []);

  const optimizeBid = useCallback(async (
    sponsoredProductId: string,
    targetRoas: number = 3.0,
    adjustmentPercent: number = 10
  ) => {
    const { data: sponsoredProduct } = await supabase
      .from('sponsored_products')
      .select('bid_amount, status')
      .eq('id', sponsoredProductId)
      .single();

    if (!sponsoredProduct) return null;

    const performance = await getPerformanceMetrics(sponsoredProductId, 7);
    const roas = calculateROAS(performance.revenue, performance.spend);
    const currentBid = sponsoredProduct.bid_amount as number;
    const adjustment = adjustmentPercent / 100;

    let newBid = currentBid;
    let action = 'maintain';

    if (performance.impressions < 100) {
      return { newBid: currentBid, action: 'learning', reason: 'Need more data' };
    }

    if (roas >= targetRoas * 1.2) {
      newBid = currentBid * (1 + adjustment);
      action = 'increase';
    } else if (roas < targetRoas * 0.7 && roas > 0) {
      newBid = currentBid * (1 - adjustment);
      action = 'decrease';
    }

    if (newBid !== currentBid) {
      await supabase
        .from('sponsored_products')
        .update({ bid_amount: Math.round(newBid * 100) / 100 })
        .eq('id', sponsoredProductId);
    }

    return { newBid, action, roas };
  }, [getPerformanceMetrics]);

  const getROASInsights = useCallback(async (sellerId?: string) => {
    const userId = sellerId || user?.id;
    if (!userId) return [];

    const { data } = await supabase
      .from('ad_daily_analytics')
      .select('sponsored_product_id, analytics_date, impressions, clicks, conversions, spend, revenue, roas')
      .eq('seller_id', userId)
      .order('analytics_date', { ascending: false })
      .limit(100);

    return data || [];
  }, [user]);

  return { calculateROAS, getPerformanceMetrics, optimizeBid, getROASInsights };
};
