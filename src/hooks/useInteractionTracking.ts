import { supabase } from "@/integrations/supabase/client";

export const useInteractionTracking = () => {
  const trackInteraction = async (
    interactionType: 'view' | 'click' | 'share' | 'like' | 'purchase',
    targetType: 'product' | 'post' | 'ad' | 'video' | 'image' | 'button' | 'audio',
    targetId: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from("user_interactions").insert({
        user_id: user?.id || null,
        interaction_type: interactionType,
        target_type: targetType,
        target_id: targetId,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          referrer: document.referrer,
        }
      });
    } catch (error) {
      console.error("Error tracking interaction:", error);
    }
  };

  return { trackInteraction };
};
