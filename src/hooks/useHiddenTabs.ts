import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define all available tabs across the system
export const ALL_SYSTEM_TABS = {
  dashboard: {
    label: 'Dashboard Tabs',
    tabs: [
      { id: 'dashboard-overview', label: 'Overview' },
      { id: 'dashboard-network', label: 'Network' },
      { id: 'dashboard-affiliate', label: 'Affiliate Tree' },
      { id: 'dashboard-binary', label: 'Binary Network' },
      { id: 'dashboard-binary-earnings', label: 'Binary Earnings' },
      { id: 'dashboard-calculator', label: 'Calculator' },
      { id: 'dashboard-notifications', label: 'Notifications' },
      { id: 'dashboard-support', label: 'Support Chat' },
      { id: 'dashboard-diamonds', label: 'Diamonds' },
      { id: 'dashboard-leaderboard', label: 'Leaderboard' },
      { id: 'dashboard-cart', label: 'Cart' },
      { id: 'dashboard-wishlist', label: 'Wishlist' },
      { id: 'dashboard-orders', label: 'Orders' },
      { id: 'dashboard-advertising', label: 'Advertising' },
      { id: 'dashboard-promo-ads', label: 'Promo Content' },
      { id: 'dashboard-transactions', label: 'Transactions' },
      { id: 'dashboard-ai-research', label: 'AI Research' },
      { id: 'dashboard-ai-chat', label: 'GPT-5 Chat' },
      { id: 'dashboard-ai-credits', label: 'AI Credits' },
      { id: 'dashboard-supplier-products', label: 'Supplier Products' },
      { id: 'dashboard-my-listings', label: 'My Listings' },
      { id: 'dashboard-account-settings', label: 'Account Settings' },
    ]
  },
  aiHub: {
    label: 'AI Hub Tabs',
    tabs: [
      { id: 'aihub-home', label: 'Home' },
      { id: 'aihub-affiliate', label: 'Affiliate' },
      { id: 'aihub-research', label: 'Research' },
      { id: 'aihub-chat', label: 'GPT-5' },
      { id: 'aihub-business', label: 'Business' },
      { id: 'aihub-text-to-image', label: 'Image Generation' },
      { id: 'aihub-text-to-video', label: 'Video Generation' },
      { id: 'aihub-text-to-music', label: 'Music Generation' },
      { id: 'aihub-enhance', label: 'Enhance' },
      { id: 'aihub-image-to-text', label: 'Analyze Image' },
      { id: 'aihub-video-to-text', label: 'Video to Text' },
      { id: 'aihub-content-creator', label: 'Content Creator' },
      { id: 'aihub-video-editor', label: 'Video Editor' },
      { id: 'aihub-web-scraper', label: 'Web Scraper' },
      { id: 'aihub-website-builder', label: 'Website Builder' },
      { id: 'aihub-creator-analytics', label: 'Creator Analytics' },
      { id: 'aihub-social-media', label: 'Social Media' },
      { id: 'aihub-contact', label: 'Contact' },
    ]
  },
  shop: {
    label: 'Shop Tabs',
    tabs: [
      { id: 'shop-main', label: 'Shop Main' },
      { id: 'shop-marketplace', label: 'Marketplace' },
      { id: 'shop-food', label: 'Food' },
      { id: 'shop-seller', label: 'Seller' },
      { id: 'shop-supplier', label: 'Supplier' },
      { id: 'shop-cart', label: 'Cart' },
      { id: 'shop-booking', label: 'Booking Services' },
    ]
  },
  feed: {
    label: 'Feed & Social Tabs',
    tabs: [
      { id: 'feed-main', label: 'Feed' },
      { id: 'feed-live', label: 'Live Streams' },
      { id: 'feed-games', label: 'Games' },
      { id: 'feed-community', label: 'Community' },
    ]
  }
};

export function useHiddenTabs() {
  const { user } = useAuth();
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setHiddenTabs([]);
      setLoading(false);
      return;
    }

    fetchHiddenTabs();
  }, [user?.id]);

  const fetchHiddenTabs = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_hidden_tabs')
        .select('hidden_tabs')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setHiddenTabs(data?.hidden_tabs || []);
    } catch (error) {
      console.error('Error fetching hidden tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTabHidden = (tabId: string): boolean => {
    return hiddenTabs.includes(tabId);
  };

  const isTabVisible = (tabId: string): boolean => {
    return !hiddenTabs.includes(tabId);
  };

  return {
    hiddenTabs,
    loading,
    isTabHidden,
    isTabVisible,
    refetch: fetchHiddenTabs
  };
}

// Admin hook for managing user hidden tabs
export function useAdminHiddenTabs(userId: string | null) {
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserHiddenTabs();
    } else {
      setHiddenTabs([]);
    }
  }, [userId]);

  const fetchUserHiddenTabs = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_hidden_tabs')
        .select('hidden_tabs')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setHiddenTabs(data?.hidden_tabs || []);
    } catch (error) {
      console.error('Error fetching user hidden tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (tabId: string) => {
    setHiddenTabs(prev => 
      prev.includes(tabId) 
        ? prev.filter(t => t !== tabId) 
        : [...prev, tabId]
    );
  };

  const toggleCategory = (categoryTabs: string[], hide: boolean) => {
    setHiddenTabs(prev => {
      if (hide) {
        return [...new Set([...prev, ...categoryTabs])];
      } else {
        return prev.filter(t => !categoryTabs.includes(t));
      }
    });
  };

  const saveHiddenTabs = async (adminId: string): Promise<boolean> => {
    if (!userId) return false;

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('user_hidden_tabs')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_hidden_tabs')
          .update({
            hidden_tabs: hiddenTabs,
            hidden_by: adminId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_hidden_tabs')
          .insert({
            user_id: userId,
            hidden_tabs: hiddenTabs,
            hidden_by: adminId
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error saving hidden tabs:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    hiddenTabs,
    loading,
    saving,
    toggleTab,
    toggleCategory,
    saveHiddenTabs,
    refetch: fetchUserHiddenTabs
  };
}
