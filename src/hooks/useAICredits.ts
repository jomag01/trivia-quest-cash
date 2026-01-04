import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AICredits {
  images_available: number;
  video_minutes_available: number;
  audio_minutes_available: number;
  total_credits: number;
  images_used: number;
  video_minutes_used: number;
  audio_minutes_used: number;
}

interface Subscription {
  id: string;
  plan_type: string;
  credits_remaining: number;
  expires_at: string;
  status: string;
}

export function useAICredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch legacy AI credits
      const { data, error } = await supabase
        .from('user_ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // Create initial record
        const { data: newData, error: insertError } = await supabase
          .from('user_ai_credits')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        setCredits(newData);
      } else {
        setCredits(data);
      }

      // Fetch active subscription
      const { data: subData } = await supabase
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(subData);
    } catch (error) {
      console.error('Error fetching AI credits:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Get total available credits (subscription + legacy)
  const getTotalCredits = useCallback((): number => {
    const legacyCredits = credits?.total_credits || 0;
    const subscriptionCredits = subscription?.credits_remaining || 0;
    return legacyCredits + subscriptionCredits;
  }, [credits, subscription]);

  const hasActiveSubscription = useCallback((): boolean => {
    return !!subscription && subscription.status === 'active';
  }, [subscription]);

  const canGenerateImage = useCallback((): boolean => {
    // Check subscription first, then legacy
    if (subscription && subscription.credits_remaining > 0) return true;
    if (!credits) return false;
    return credits.images_available > 0;
  }, [credits, subscription]);

  const canGenerateVideo = useCallback((minutes: number = 0.5): boolean => {
    if (subscription && subscription.credits_remaining >= minutes * 10) return true;
    if (!credits) return false;
    return Number(credits.video_minutes_available) >= minutes;
  }, [credits, subscription]);

  const canGenerateAudio = useCallback((minutes: number): boolean => {
    if (subscription && subscription.credits_remaining >= minutes * 5) return true;
    if (!credits) return false;
    return Number(credits.audio_minutes_available) >= minutes;
  }, [credits, subscription]);

  // Deduct from subscription first, then legacy
  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!user) return false;

    try {
      // Try subscription first
      if (subscription && subscription.credits_remaining >= amount) {
        const { error } = await supabase.rpc('deduct_subscription_credits', {
          p_user_id: user.id,
          p_credits: amount
        });

        if (!error) {
          setSubscription(prev => prev ? {
            ...prev,
            credits_remaining: prev.credits_remaining - amount
          } : null);
          return true;
        }
      }

      // Fall back to legacy total_credits
      if (credits && credits.total_credits >= amount) {
        const { error } = await supabase
          .from('user_ai_credits')
          .update({ total_credits: credits.total_credits - amount })
          .eq('user_id', user.id);

        if (!error) {
          setCredits(prev => prev ? {
            ...prev,
            total_credits: prev.total_credits - amount
          } : null);
          return true;
        }
      }

      toast.error('Insufficient credits');
      return false;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }, [user, credits, subscription]);

  const deductImageCredit = useCallback(async (count: number = 1): Promise<boolean> => {
    if (!user) return false;

    // Try subscription first
    if (subscription && subscription.credits_remaining >= count) {
      const result = await deductCredits(count);
      if (result) return true;
    }

    // Fall back to legacy
    if (!credits || credits.images_available < count) {
      toast.error(`Insufficient image credits. You have ${credits?.images_available || 0} remaining.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_ai_credits')
        .update({
          images_available: credits.images_available - count,
          images_used: credits.images_used + count
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCredits(prev => prev ? {
        ...prev,
        images_available: prev.images_available - count,
        images_used: prev.images_used + count
      } : null);

      return true;
    } catch (error) {
      console.error('Error deducting image credit:', error);
      toast.error('Failed to deduct credits');
      return false;
    }
  }, [user, credits, subscription, deductCredits]);

  const deductVideoMinutes = useCallback(async (minutes: number): Promise<boolean> => {
    if (!user) return false;

    // Convert to credits (10 credits per minute) and try subscription first
    const creditsNeeded = Math.ceil(minutes * 10);
    if (subscription && subscription.credits_remaining >= creditsNeeded) {
      const result = await deductCredits(creditsNeeded);
      if (result) return true;
    }

    // Fall back to legacy
    if (!credits) return false;
    const available = Number(credits.video_minutes_available);
    if (available < minutes) {
      toast.error(`Insufficient video minutes. You have ${available.toFixed(1)} minutes remaining.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_ai_credits')
        .update({
          video_minutes_available: available - minutes,
          video_minutes_used: Number(credits.video_minutes_used) + minutes
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCredits(prev => prev ? {
        ...prev,
        video_minutes_available: available - minutes,
        video_minutes_used: Number(prev.video_minutes_used) + minutes
      } : null);

      return true;
    } catch (error) {
      console.error('Error deducting video minutes:', error);
      toast.error('Failed to deduct video minutes');
      return false;
    }
  }, [user, credits, subscription, deductCredits]);

  const deductAudioMinutes = useCallback(async (minutes: number): Promise<boolean> => {
    if (!user) return false;

    // Convert to credits (5 credits per minute) and try subscription first
    const creditsNeeded = Math.ceil(minutes * 5);
    if (subscription && subscription.credits_remaining >= creditsNeeded) {
      const result = await deductCredits(creditsNeeded);
      if (result) return true;
    }

    // Fall back to legacy
    if (!credits) return false;
    const available = Number(credits.audio_minutes_available);
    if (available < minutes) {
      toast.error(`Insufficient audio minutes. You have ${available.toFixed(1)} minutes remaining.`);
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_ai_credits')
        .update({
          audio_minutes_available: available - minutes,
          audio_minutes_used: Number(credits.audio_minutes_used) + minutes
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCredits(prev => prev ? {
        ...prev,
        audio_minutes_available: available - minutes,
        audio_minutes_used: Number(prev.audio_minutes_used) + minutes
      } : null);

      return true;
    } catch (error) {
      console.error('Error deducting audio minutes:', error);
      toast.error('Failed to deduct audio minutes');
      return false;
    }
  }, [user, credits, subscription, deductCredits]);

  return {
    credits,
    subscription,
    loading,
    refetch: fetchCredits,
    getTotalCredits,
    hasActiveSubscription,
    canGenerateImage,
    canGenerateVideo,
    canGenerateAudio,
    deductCredits,
    deductImageCredit,
    deductVideoMinutes,
    deductAudioMinutes
  };
}
