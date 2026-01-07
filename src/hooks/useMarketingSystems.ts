import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketingSystem {
  id: string;
  system_key: string;
  system_name: string;
  description: string | null;
  is_enabled: boolean;
  icon: string | null;
  display_order: number;
}

export function useMarketingSystems() {
  const [systems, setSystems] = useState<MarketingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabledSystems, setEnabledSystems] = useState<Set<string>>(new Set());

  const fetchSystems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_systems')
        .select('*')
        .order('display_order');

      if (error) throw error;
      
      setSystems((data as MarketingSystem[]) || []);
      setEnabledSystems(new Set(
        ((data as MarketingSystem[]) || [])
          .filter(s => s.is_enabled)
          .map(s => s.system_key)
      ));
    } catch (error) {
      console.error('Error fetching marketing systems:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystems();

    // Subscribe to changes
    const channel = supabase
      .channel('marketing_systems_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'marketing_systems' },
        () => {
          fetchSystems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSystems]);

  const isSystemEnabled = useCallback((systemKey: string): boolean => {
    return enabledSystems.has(systemKey);
  }, [enabledSystems]);

  const isSystemDisabled = useCallback((systemKey: string): boolean => {
    return !enabledSystems.has(systemKey);
  }, [enabledSystems]);

  return {
    systems,
    loading,
    enabledSystems,
    isSystemEnabled,
    isSystemDisabled,
    refetch: fetchSystems
  };
}
