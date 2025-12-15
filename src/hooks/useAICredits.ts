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

export function useAICredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<AICredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
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
    } catch (error) {
      console.error('Error fetching AI credits:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const canGenerateImage = useCallback((): boolean => {
    if (!credits) return false;
    return credits.images_available > 0;
  }, [credits]);

  const canGenerateVideo = useCallback((minutes: number = 0.5): boolean => {
    if (!credits) return false;
    return Number(credits.video_minutes_available) >= minutes;
  }, [credits]);

  const canGenerateAudio = useCallback((minutes: number): boolean => {
    if (!credits) return false;
    return Number(credits.audio_minutes_available) >= minutes;
  }, [credits]);

  const deductImageCredit = useCallback(async (count: number = 1): Promise<boolean> => {
    if (!user || !credits) return false;

    if (credits.images_available < count) {
      toast.error(`Insufficient image credits. You have ${credits.images_available} remaining.`);
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
  }, [user, credits]);

  const deductVideoMinutes = useCallback(async (minutes: number): Promise<boolean> => {
    if (!user || !credits) return false;

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
  }, [user, credits]);

  const deductAudioMinutes = useCallback(async (minutes: number): Promise<boolean> => {
    if (!user || !credits) return false;

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
  }, [user, credits]);

  return {
    credits,
    loading,
    refetch: fetchCredits,
    canGenerateImage,
    canGenerateVideo,
    canGenerateAudio,
    deductImageCredit,
    deductVideoMinutes,
    deductAudioMinutes
  };
}
