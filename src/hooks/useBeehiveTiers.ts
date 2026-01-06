import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BeehiveTier {
  id: string;
  tier_name: string;
  plan_type: 'monthly' | 'biannual' | 'yearly';
  price: number;
  credits_included: number;
  binary_volume: number;
  daily_cap: number;
  cycle_volume: number;
  cycle_commission_percent: number;
  left_volume_required: number;
  right_volume_required: number;
  is_active: boolean;
  display_order: number;
}

export function useBeehiveTiers() {
  const [tiers, setTiers] = useState<BeehiveTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTiers();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('beehive-tiers-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beehive_tiers' },
        () => fetchTiers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('beehive_tiers')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setTiers((data as BeehiveTier[]) || []);
    } catch (error) {
      console.error('Error fetching beehive tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierByPlanType = (planType: string) => {
    return tiers.find(t => t.plan_type === planType);
  };

  const getMonthlyTier = () => getTierByPlanType('monthly');
  const getBiannualTier = () => getTierByPlanType('biannual');
  const getYearlyTier = () => getTierByPlanType('yearly');

  return {
    tiers,
    loading,
    getTierByPlanType,
    getMonthlyTier,
    getBiannualTier,
    getYearlyTier,
    refetch: fetchTiers
  };
}
