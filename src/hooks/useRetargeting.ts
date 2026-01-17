import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RetargetingSegment {
  segment: string;
  products: string[];
  categories: string[];
  recencyDays: number;
  bidBoost: number;
}

const getVisitorId = (): string => {
  return localStorage.getItem('tb_visitor_id') || '';
};

export const useRetargeting = () => {
  const { user } = useAuth();

  // Build user's retargeting profile based on behavior
  const buildRetargetingProfile = useCallback(async (): Promise<RetargetingSegment[]> => {
    const visitorId = getVisitorId();
    if (!user && !visitorId) return [];

    const segments: RetargetingSegment[] = [];

    // Fetch recent behavior events
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let query = supabase
      .from('user_behavior_events')
      .select('event_type, target_id, target_category, target_price, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (user) {
      query = query.eq('user_id', user.id);
    } else {
      query = query.eq('visitor_id', visitorId);
    }

    const { data: events } = await query.limit(500);

    if (!events?.length) return [];

    // Analyze events to build segments
    const productViews = new Map<string, { count: number; lastSeen: Date; category?: string; price?: number }>();
    const cartAbandons = new Set<string>();
    const purchases = new Set<string>();
    const categoryViews = new Map<string, number>();

    for (const event of events) {
      const productId = event.target_id;
      const category = event.target_category;
      const eventDate = new Date(event.created_at);

      switch (event.event_type) {
        case 'product_view':
          if (productId) {
            const existing = productViews.get(productId) || { count: 0, lastSeen: eventDate };
            productViews.set(productId, {
              count: existing.count + 1,
              lastSeen: eventDate > existing.lastSeen ? eventDate : existing.lastSeen,
              category: category || existing.category,
              price: event.target_price || existing.price,
            });
          }
          if (category) {
            categoryViews.set(category, (categoryViews.get(category) || 0) + 1);
          }
          break;

        case 'add_to_cart':
          if (productId) cartAbandons.add(productId);
          break;

        case 'purchase':
          if (productId) {
            purchases.add(productId);
            cartAbandons.delete(productId);
          }
          break;
      }
    }

    // Segment 1: Cart Abandoners (highest priority - 2x bid boost)
    const cartAbandonProducts = Array.from(cartAbandons).filter(p => !purchases.has(p));
    if (cartAbandonProducts.length > 0) {
      segments.push({
        segment: 'cart_abandoner',
        products: cartAbandonProducts,
        categories: [],
        recencyDays: 7,
        bidBoost: 2.0,
      });
    }

    // Segment 2: Frequent Viewers (viewed 3+ times - 1.5x bid boost)
    const frequentlyViewed = Array.from(productViews.entries())
      .filter(([id, data]) => data.count >= 3 && !purchases.has(id))
      .map(([id]) => id);

    if (frequentlyViewed.length > 0) {
      segments.push({
        segment: 'frequent_viewer',
        products: frequentlyViewed,
        categories: [],
        recencyDays: 7,
        bidBoost: 1.5,
      });
    }

    // Segment 3: Recent Viewers (last 24 hours - 1.3x bid boost)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const recentlyViewed = Array.from(productViews.entries())
      .filter(([id, data]) => data.lastSeen > oneDayAgo && !purchases.has(id))
      .map(([id]) => id);

    if (recentlyViewed.length > 0) {
      segments.push({
        segment: 'recent_viewer',
        products: recentlyViewed,
        categories: [],
        recencyDays: 1,
        bidBoost: 1.3,
      });
    }

    // Segment 4: Category Interest (top categories - 1.2x bid boost)
    const topCategories = Array.from(categoryViews.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    if (topCategories.length > 0) {
      segments.push({
        segment: 'category_interest',
        products: [],
        categories: topCategories,
        recencyDays: 7,
        bidBoost: 1.2,
      });
    }

    // Segment 5: Past Purchasers (for upsell/cross-sell - 1.1x bid boost)
    if (purchases.size > 0) {
      segments.push({
        segment: 'past_purchaser',
        products: Array.from(purchases),
        categories: [],
        recencyDays: 30,
        bidBoost: 1.1,
      });
    }

    return segments;
  }, [user]);

  // Get retargeting boost for a specific product
  const getRetargetingBoost = useCallback(async (
    productId: string,
    categoryId?: string
  ): Promise<{ boost: number; segment?: string }> => {
    const segments = await buildRetargetingProfile();

    for (const segment of segments) {
      // Check if product is in retargeting list
      if (segment.products.includes(productId)) {
        return { boost: segment.bidBoost, segment: segment.segment };
      }

      // Check category match
      if (categoryId && segment.categories.includes(categoryId)) {
        return { boost: segment.bidBoost, segment: segment.segment };
      }
    }

    return { boost: 1.0 };
  }, [buildRetargetingProfile]);

  // Get products for retargeting display
  const getRetargetedProducts = useCallback(async (limit: number = 10): Promise<string[]> => {
    const segments = await buildRetargetingProfile();
    
    // Collect products from segments in priority order
    const allProducts: string[] = [];
    
    for (const segment of segments) {
      for (const productId of segment.products) {
        if (!allProducts.includes(productId)) {
          allProducts.push(productId);
        }
        if (allProducts.length >= limit) break;
      }
      if (allProducts.length >= limit) break;
    }

    return allProducts;
  }, [buildRetargetingProfile]);

  // Store retargeting segment - simplified to avoid schema mismatch
  const storeRetargetingSegment = useCallback(async () => {
    // Segments are computed on-the-fly, no storage needed
  }, []);

  // Auto-update retargeting profile periodically
  useEffect(() => {
    const interval = setInterval(() => {
      storeRetargetingSegment();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Initial store
    storeRetargetingSegment();

    return () => clearInterval(interval);
  }, [storeRetargetingSegment]);

  return {
    buildRetargetingProfile,
    getRetargetingBoost,
    getRetargetedProducts,
    storeRetargetingSegment,
  };
};
