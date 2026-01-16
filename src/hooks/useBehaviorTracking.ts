import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TrackingEvent {
  event_type: string;
  event_category?: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  target_category?: string;
  target_price?: number;
  search_query?: string;
  metadata?: Record<string, any>;
}

const getVisitorId = (): string => {
  let visitorId = localStorage.getItem('tb_visitor_id');
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('tb_visitor_id', visitorId);
  }
  return visitorId;
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('tb_session_id');
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('tb_session_id', sessionId);
  }
  return sessionId;
};

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
};

const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
};

export const useBehaviorTracking = () => {
  const { user } = useAuth();
  const eventQueue = useRef<TrackingEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return;

    const events = [...eventQueue.current];
    eventQueue.current = [];

    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const deviceType = getDeviceType();
    const browser = getBrowser();

    const formattedEvents = events.map(event => ({
      user_id: user?.id || null,
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: event.event_type,
      event_category: event.event_category || null,
      target_type: event.target_type || null,
      target_id: event.target_id || null,
      target_name: event.target_name || null,
      target_category: event.target_category || null,
      target_price: event.target_price || null,
      search_query: event.search_query || null,
      page_url: window.location.href,
      referrer_url: document.referrer || null,
      device_type: deviceType,
      browser: browser,
      metadata: event.metadata || {},
    }));

    try {
      await supabase.from('user_behavior_events').insert(formattedEvents);
    } catch (error) {
      console.error('Error tracking behavior events:', error);
    }
  }, [user]);

  const trackEvent = useCallback((event: TrackingEvent) => {
    eventQueue.current.push(event);

    // Debounce flush - wait 500ms before sending
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }
    flushTimeout.current = setTimeout(() => {
      flushEvents();
    }, 500);
  }, [flushEvents]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
      }
      flushEvents();
    };
  }, [flushEvents]);

  // Pre-built tracking functions
  const trackProductView = useCallback((productId: string, productName: string, category?: string, price?: number) => {
    trackEvent({
      event_type: 'product_view',
      event_category: 'shopping',
      target_type: 'product',
      target_id: productId,
      target_name: productName,
      target_category: category,
      target_price: price,
    });
  }, [trackEvent]);

  const trackCategoryView = useCallback((categoryId: string, categoryName: string) => {
    trackEvent({
      event_type: 'category_view',
      event_category: 'shopping',
      target_type: 'category',
      target_id: categoryId,
      target_name: categoryName,
    });
  }, [trackEvent]);

  const trackSearch = useCallback((query: string, resultsCount?: number) => {
    trackEvent({
      event_type: 'search',
      event_category: 'shopping',
      search_query: query,
      metadata: { results_count: resultsCount },
    });
  }, [trackEvent]);

  const trackAddToCart = useCallback((productId: string, productName: string, price: number, quantity: number = 1) => {
    trackEvent({
      event_type: 'add_to_cart',
      event_category: 'shopping',
      target_type: 'product',
      target_id: productId,
      target_name: productName,
      target_price: price,
      metadata: { quantity },
    });
  }, [trackEvent]);

  const trackCheckoutStart = useCallback((cartValue: number, itemCount: number) => {
    trackEvent({
      event_type: 'checkout_start',
      event_category: 'shopping',
      target_price: cartValue,
      metadata: { item_count: itemCount },
    });
  }, [trackEvent]);

  const trackPurchase = useCallback((orderId: string, totalValue: number, items: any[]) => {
    trackEvent({
      event_type: 'purchase',
      event_category: 'shopping',
      target_type: 'order',
      target_id: orderId,
      target_price: totalValue,
      metadata: { items },
    });
  }, [trackEvent]);

  const trackAIHubSearch = useCallback((service: string, query: string) => {
    trackEvent({
      event_type: 'ai_hub_search',
      event_category: 'ai_hub',
      target_type: 'ai_service',
      target_id: service,
      search_query: query,
    });
  }, [trackEvent]);

  const trackAIGeneration = useCallback((generationType: string, metadata?: Record<string, any>) => {
    trackEvent({
      event_type: 'ai_generation',
      event_category: 'ai_hub',
      target_type: 'ai_generation',
      target_id: generationType,
      metadata,
    });
  }, [trackEvent]);

  const trackBeesMateClick = useCallback((profileId: string, action: string) => {
    trackEvent({
      event_type: 'beesmate_click',
      event_category: 'beesmate',
      target_type: 'profile',
      target_id: profileId,
      metadata: { action },
    });
  }, [trackEvent]);

  const trackBeesMateView = useCallback((profileId: string) => {
    trackEvent({
      event_type: 'beesmate_view',
      event_category: 'beesmate',
      target_type: 'profile',
      target_id: profileId,
    });
  }, [trackEvent]);

  const trackAdImpression = useCallback((adId: string, placement: string, position: number) => {
    trackEvent({
      event_type: 'ad_impression',
      event_category: 'advertising',
      target_type: 'ad',
      target_id: adId,
      metadata: { placement, position },
    });
  }, [trackEvent]);

  const trackAdClick = useCallback((adId: string, placement: string) => {
    trackEvent({
      event_type: 'ad_click',
      event_category: 'advertising',
      target_type: 'ad',
      target_id: adId,
      metadata: { placement },
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackProductView,
    trackCategoryView,
    trackSearch,
    trackAddToCart,
    trackCheckoutStart,
    trackPurchase,
    trackAIHubSearch,
    trackAIGeneration,
    trackBeesMateClick,
    trackBeesMateView,
    trackAdImpression,
    trackAdClick,
  };
};
