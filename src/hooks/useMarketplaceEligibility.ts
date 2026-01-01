import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MarketplaceEligibility {
  isEligible: boolean;
  loading: boolean;
  diamonds: number;
  referralCount: number;
  hasPurchase: boolean;
  isAdminActivated: boolean;
  diamondThreshold: number;
}

export function useMarketplaceEligibility(userId: string | undefined) {
  const [eligibility, setEligibility] = useState<MarketplaceEligibility>({
    isEligible: false,
    loading: true,
    diamonds: 0,
    referralCount: 0,
    hasPurchase: false,
    isAdminActivated: false,
    diamondThreshold: 150,
  });

  useEffect(() => {
    if (!userId) {
      setEligibility(prev => ({ ...prev, loading: false }));
      return;
    }

    const checkEligibility = async () => {
      try {
        // Call the RPC function for eligibility check
        const { data: isEligible, error: rpcError } = await supabase.rpc('check_marketplace_eligibility', {
          user_uuid: userId,
        });

        if (rpcError) throw rpcError;

        // Get additional details for display
        const { data: profile } = await supabase
          .from('profiles')
          .select('diamonds, marketplace_activated')
          .eq('id', userId)
          .single();

        // Count referrals
        const { count: referralCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('referred_by', userId);

        // Check for approved purchases
        const { data: hasCreditPurchase } = await supabase
          .from('credit_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle();

        const { data: hasAIPurchase } = await supabase
          .from('binary_ai_purchases')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle();

        // Get threshold setting
        const { data: settings } = await supabase
          .from('marketplace_settings')
          .select('setting_value')
          .eq('setting_key', 'free_listing_diamond_threshold')
          .maybeSingle();

        setEligibility({
          isEligible: isEligible === true,
          loading: false,
          diamonds: profile?.diamonds || 0,
          referralCount: referralCount || 0,
          hasPurchase: !!(hasCreditPurchase || hasAIPurchase),
          isAdminActivated: profile?.marketplace_activated || false,
          diamondThreshold: settings?.setting_value ? parseInt(settings.setting_value) : 150,
        });
      } catch (error) {
        console.error('Error checking marketplace eligibility:', error);
        setEligibility(prev => ({ ...prev, loading: false, isEligible: false }));
      }
    };

    checkEligibility();
  }, [userId]);

  return eligibility;
}
