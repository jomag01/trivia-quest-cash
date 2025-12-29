import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getVisitorId, getTrackingCookie } from "@/lib/cookieTracking";

const generateSessionId = (): string => {
  const stored = sessionStorage.getItem('session_id');
  if (stored) return stored;
  const newId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  sessionStorage.setItem('session_id', newId);
  return newId;
};

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const trackPageView = async () => {
      try {
        const visitorId = getVisitorId();
        const sessionId = generateSessionId();
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get referral info from cookies
        const referralInfo = getTrackingCookie('referral_referrer');
        const affiliateInfo = getTrackingCookie('affiliate_referrer');
        const referralUserId = referralInfo || affiliateInfo || null;

        // Track page view
        await supabase.from("page_views").insert({
          visitor_id: visitorId,
          user_id: user?.id || null,
          page_path: location.pathname,
          page_title: document.title,
          referrer_url: document.referrer || null,
          user_agent: navigator.userAgent,
          referral_source: referralUserId ? 'affiliate' : (document.referrer ? 'organic' : 'direct'),
          referral_user_id: referralUserId,
          session_id: sessionId
        });

        // Update or create visitor session
        const { data: existingSession } = await supabase
          .from("visitor_sessions")
          .select("id, total_page_views")
          .eq("visitor_id", visitorId)
          .maybeSingle();

        if (existingSession) {
          await supabase
            .from("visitor_sessions")
            .update({
              last_visit_at: new Date().toISOString(),
              total_page_views: (existingSession.total_page_views || 0) + 1,
              user_id: user?.id || null,
              converted_to_user: user ? true : undefined
            })
            .eq("visitor_id", visitorId);
        } else {
          await supabase.from("visitor_sessions").insert({
            visitor_id: visitorId,
            user_id: user?.id || null,
            referral_source: referralUserId ? 'affiliate' : (document.referrer ? 'organic' : 'direct'),
            referral_user_id: referralUserId,
            total_page_views: 1,
            converted_to_user: !!user
          });
        }
      } catch (error) {
        console.error("Error tracking page view:", error);
      }
    };

    trackPageView();
  }, [location.pathname]);
};
