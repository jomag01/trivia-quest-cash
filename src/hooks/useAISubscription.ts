import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AISubscription {
  id: string;
  plan_type: string;
  status: string;
  credits_remaining: number;
  expires_at: string;
  renewed_at: string | null;
  renewal_count: number;
}

interface FeatureRestriction {
  feature_key: string;
  is_hidden: boolean;
}

export function useAISubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<AISubscription | null>(null);
  const [restrictions, setRestrictions] = useState<FeatureRestriction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchRestrictions = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('ai_monthly_restrictions')
        .select('feature_key, is_hidden')
        .eq('is_hidden', true);

      setRestrictions(data || []);
    } catch (error) {
      console.error('Error fetching restrictions:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    fetchRestrictions();
  }, [fetchSubscription, fetchRestrictions]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ai-subscription-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_subscriptions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchSubscription]);

  const hasActiveSubscription = !!subscription && subscription.status === 'active';
  const isYearlySubscriber = hasActiveSubscription && subscription?.plan_type === 'yearly';
  const isMonthlySubscriber = hasActiveSubscription && subscription?.plan_type === 'monthly';

  const isFeatureAvailable = useCallback((featureKey: string): boolean => {
    // No subscription = no access
    if (!hasActiveSubscription) return false;
    
    // Yearly subscribers have full access
    if (isYearlySubscriber) return true;
    
    // Monthly subscribers check restrictions
    const restriction = restrictions.find(r => r.feature_key === featureKey);
    return !restriction?.is_hidden;
  }, [hasActiveSubscription, isYearlySubscriber, restrictions]);

  const deductCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!user || !subscription) return false;
    
    if (subscription.credits_remaining < amount) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc('deduct_subscription_credits', {
        p_user_id: user.id,
        p_credits: amount
      });

      if (error) throw error;
      
      // Refresh subscription data
      await fetchSubscription();
      return data;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }, [user, subscription, fetchSubscription]);

  const getCreditsRemaining = useCallback((): number => {
    return subscription?.credits_remaining || 0;
  }, [subscription]);

  const getDaysUntilExpiry = useCallback((): number => {
    if (!subscription) return 0;
    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  return {
    subscription,
    loading,
    hasActiveSubscription,
    isYearlySubscriber,
    isMonthlySubscriber,
    isFeatureAvailable,
    deductCredits,
    getCreditsRemaining,
    getDaysUntilExpiry,
    refetch: fetchSubscription
  };
}