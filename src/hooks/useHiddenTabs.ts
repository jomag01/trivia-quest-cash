import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Define all available tabs and their sub-components across the system
export interface TabComponent {
  id: string;
  label: string;
}

export interface SystemTab {
  id: string;
  label: string;
  components?: TabComponent[];
}

export interface SystemCategory {
  label: string;
  tabs: SystemTab[];
}

export const ALL_SYSTEM_TABS: Record<string, SystemCategory> = {
  dashboard: {
    label: 'Dashboard Tabs',
    tabs: [
      { 
        id: 'dashboard-overview', 
        label: 'Overview',
        components: [
          { id: 'dashboard-overview-orders', label: 'Order Status Section' },
          { id: 'dashboard-overview-quick-links', label: 'Quick Links' },
          { id: 'dashboard-overview-stats', label: 'Account Statistics' },
          { id: 'dashboard-overview-recent', label: 'Recent Activity' },
        ]
      },
      { 
        id: 'dashboard-network', 
        label: 'Network',
        components: [
          { id: 'dashboard-network-tree', label: 'Network Tree View' },
          { id: 'dashboard-network-stats', label: 'Network Statistics' },
        ]
      },
      { 
        id: 'dashboard-affiliate', 
        label: 'Affiliate Tree',
        components: [
          { id: 'dashboard-affiliate-tree', label: 'Genealogy Tree' },
          { id: 'dashboard-affiliate-rank', label: 'Rank Progress' },
          { id: 'dashboard-affiliate-earnings', label: 'Earnings Summary' },
        ]
      },
      { 
        id: 'dashboard-binary', 
        label: 'Binary Network',
        components: [
          { id: 'dashboard-binary-tree', label: 'Binary Tree View' },
          { id: 'dashboard-binary-volume', label: 'Volume Tracking' },
          { id: 'dashboard-binary-pending', label: 'Pending Placements' },
        ]
      },
      { 
        id: 'dashboard-binary-earnings', 
        label: 'Binary Earnings',
        components: [
          { id: 'dashboard-binary-earnings-chart', label: 'Earnings Chart' },
          { id: 'dashboard-binary-earnings-history', label: 'Commission History' },
        ]
      },
      { id: 'dashboard-calculator', label: 'Calculator' },
      { 
        id: 'dashboard-notifications', 
        label: 'Notifications',
        components: [
          { id: 'dashboard-notifications-list', label: 'Notification List' },
          { id: 'dashboard-notifications-settings', label: 'Notification Settings' },
        ]
      },
      { id: 'dashboard-support', label: 'Support Chat' },
      { 
        id: 'dashboard-diamonds', 
        label: 'Diamonds',
        components: [
          { id: 'dashboard-diamonds-balance', label: 'Diamond Balance' },
          { id: 'dashboard-diamonds-history', label: 'Transaction History' },
          { id: 'dashboard-diamonds-marketplace', label: 'Diamond Marketplace' },
          { id: 'dashboard-diamonds-convert', label: 'Currency Conversion' },
        ]
      },
      { id: 'dashboard-leaderboard', label: 'Leaderboard' },
      { id: 'dashboard-cart', label: 'Cart' },
      { id: 'dashboard-wishlist', label: 'Wishlist' },
      { 
        id: 'dashboard-orders', 
        label: 'Orders',
        components: [
          { id: 'dashboard-orders-list', label: 'Order List' },
          { id: 'dashboard-orders-tracking', label: 'Order Tracking' },
          { id: 'dashboard-orders-reviews', label: 'Review Orders' },
        ]
      },
      { 
        id: 'dashboard-advertising', 
        label: 'Advertising',
        components: [
          { id: 'dashboard-advertising-create', label: 'Create Ad' },
          { id: 'dashboard-advertising-manage', label: 'Manage Ads' },
          { id: 'dashboard-advertising-analytics', label: 'Ad Analytics' },
        ]
      },
      { id: 'dashboard-promo-ads', label: 'Promo Content' },
      { 
        id: 'dashboard-transactions', 
        label: 'Transactions',
        components: [
          { id: 'dashboard-transactions-history', label: 'Transaction History' },
          { id: 'dashboard-transactions-pending', label: 'Pending Transactions' },
        ]
      },
      { id: 'dashboard-ai-research', label: 'AI Research' },
      { id: 'dashboard-ai-chat', label: 'GPT-5 Chat' },
      { 
        id: 'dashboard-ai-credits', 
        label: 'AI Credits',
        components: [
          { id: 'dashboard-ai-credits-balance', label: 'Credits Balance' },
          { id: 'dashboard-ai-credits-buy', label: 'Buy Credits' },
          { id: 'dashboard-ai-credits-history', label: 'Usage History' },
        ]
      },
      { id: 'dashboard-supplier-products', label: 'Supplier Products' },
      { 
        id: 'dashboard-my-listings', 
        label: 'My Listings',
        components: [
          { id: 'dashboard-my-listings-products', label: 'Product Listings' },
          { id: 'dashboard-my-listings-services', label: 'Service Listings' },
          { id: 'dashboard-my-listings-auctions', label: 'Auction Listings' },
        ]
      },
      { 
        id: 'dashboard-account-settings', 
        label: 'Account Settings',
        components: [
          { id: 'dashboard-account-settings-profile', label: 'Profile Settings' },
          { id: 'dashboard-account-settings-payout', label: 'Payout Accounts' },
          { id: 'dashboard-account-settings-privacy', label: 'Privacy Settings' },
        ]
      },
    ]
  },
  aiHub: {
    label: 'AI Hub Tabs',
    tabs: [
      { 
        id: 'aihub-home', 
        label: 'Home',
        components: [
          { id: 'aihub-home-weather', label: 'Weather Widget' },
          { id: 'aihub-home-gallery', label: 'AI Gallery' },
          { id: 'aihub-home-quick-actions', label: 'Quick Actions' },
        ]
      },
      { 
        id: 'aihub-affiliate', 
        label: 'Affiliate',
        components: [
          { id: 'aihub-affiliate-tree', label: 'Binary Tree' },
          { id: 'aihub-affiliate-earnings', label: 'Earnings Overview' },
        ]
      },
      { id: 'aihub-research', label: 'Research' },
      { id: 'aihub-chat', label: 'GPT-5' },
      { 
        id: 'aihub-business', 
        label: 'Business',
        components: [
          { id: 'aihub-business-solutions', label: 'Business Solutions' },
          { id: 'aihub-business-analysis', label: 'Market Analysis' },
        ]
      },
      { 
        id: 'aihub-text-to-image', 
        label: 'Image Generation',
        components: [
          { id: 'aihub-text-to-image-generate', label: 'Generate Image' },
          { id: 'aihub-text-to-image-gallery', label: 'Image Gallery' },
        ]
      },
      { id: 'aihub-text-to-video', label: 'Video Generation' },
      { id: 'aihub-text-to-music', label: 'Music Generation' },
      { id: 'aihub-enhance', label: 'Enhance' },
      { id: 'aihub-image-to-text', label: 'Analyze Image' },
      { id: 'aihub-video-to-text', label: 'Video to Text' },
      { 
        id: 'aihub-content-creator', 
        label: 'Content Creator',
        components: [
          { id: 'aihub-content-creator-ads', label: 'Ads Maker' },
          { id: 'aihub-content-creator-blog', label: 'Blog Generator' },
          { id: 'aihub-content-creator-social', label: 'Social Posts' },
        ]
      },
      { id: 'aihub-video-editor', label: 'Video Editor' },
      { id: 'aihub-web-scraper', label: 'Web Scraper' },
      { id: 'aihub-website-builder', label: 'Website Builder' },
      { id: 'aihub-creator-analytics', label: 'Creator Analytics' },
      { 
        id: 'aihub-social-media', 
        label: 'Social Media',
        components: [
          { id: 'aihub-social-media-manager', label: 'Social Manager' },
          { id: 'aihub-social-media-publisher', label: 'Post Publisher' },
        ]
      },
      { id: 'aihub-contact', label: 'Contact' },
    ]
  },
  shop: {
    label: 'Shop Tabs',
    tabs: [
      { 
        id: 'shop-main', 
        label: 'Shop Main',
        components: [
          { id: 'shop-main-products', label: 'Product Grid' },
          { id: 'shop-main-categories', label: 'Category Slider' },
          { id: 'shop-main-featured', label: 'Featured Products' },
          { id: 'shop-main-ads', label: 'Ad Slider' },
        ]
      },
      { 
        id: 'shop-marketplace', 
        label: 'Marketplace',
        components: [
          { id: 'shop-marketplace-listings', label: 'Marketplace Listings' },
          { id: 'shop-marketplace-create', label: 'Create Listing' },
        ]
      },
      { 
        id: 'shop-food', 
        label: 'Food',
        components: [
          { id: 'shop-food-restaurants', label: 'Restaurant List' },
          { id: 'shop-food-orders', label: 'Food Orders' },
          { id: 'shop-food-cart', label: 'Food Cart' },
        ]
      },
      { 
        id: 'shop-seller', 
        label: 'Seller',
        components: [
          { id: 'shop-seller-products', label: 'Product Management' },
          { id: 'shop-seller-orders', label: 'Order Processing' },
          { id: 'shop-seller-analytics', label: 'Sales Analytics' },
        ]
      },
      { 
        id: 'shop-supplier', 
        label: 'Supplier',
        components: [
          { id: 'shop-supplier-portal', label: 'Supplier Portal' },
          { id: 'shop-supplier-inventory', label: 'Inventory Management' },
        ]
      },
      { id: 'shop-cart', label: 'Cart' },
      { 
        id: 'shop-booking', 
        label: 'Booking Services',
        components: [
          { id: 'shop-booking-services', label: 'Service Listings' },
          { id: 'shop-booking-my-bookings', label: 'My Bookings' },
          { id: 'shop-booking-provider', label: 'Provider Dashboard' },
        ]
      },
    ]
  },
  feed: {
    label: 'Feed & Social Tabs',
    tabs: [
      { 
        id: 'feed-main', 
        label: 'Feed',
        components: [
          { id: 'feed-main-posts', label: 'Post Feed' },
          { id: 'feed-main-stories', label: 'Story Slider' },
          { id: 'feed-main-create', label: 'Create Post' },
        ]
      },
      { 
        id: 'feed-live', 
        label: 'Live Streams',
        components: [
          { id: 'feed-live-list', label: 'Live Stream List' },
          { id: 'feed-live-go-live', label: 'Go Live Button' },
        ]
      },
      { 
        id: 'feed-games', 
        label: 'Games',
        components: [
          { id: 'feed-games-list', label: 'Games List' },
          { id: 'feed-games-treasure', label: 'Treasure Hunt' },
        ]
      },
      { 
        id: 'feed-community', 
        label: 'Community',
        components: [
          { id: 'feed-community-groups', label: 'Groups List' },
          { id: 'feed-community-chats', label: 'Private Chats' },
        ]
      },
    ]
  }
};

export function useHiddenTabs() {
  const { user } = useAuth();
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHiddenTabs = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_hidden_tabs')
        .select('hidden_tabs')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      // Only set hidden tabs if data exists for this specific user
      // If no entry exists, user has no hidden tabs (all visible)
      setHiddenTabs(data?.hidden_tabs || []);
    } catch (error) {
      console.error('Error fetching hidden tabs:', error);
      // On error, default to empty (all tabs visible)
      setHiddenTabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reset state when user changes
    setHiddenTabs([]);
    
    if (!user?.id) {
      setLoading(false);
      return;
    }

    fetchHiddenTabs(user.id);
  }, [user?.id, fetchHiddenTabs]);

  const isTabHidden = useCallback((tabId: string): boolean => {
    return hiddenTabs.includes(tabId);
  }, [hiddenTabs]);

  const isTabVisible = useCallback((tabId: string): boolean => {
    return !hiddenTabs.includes(tabId);
  }, [hiddenTabs]);

  const refetch = useCallback(() => {
    if (user?.id) {
      fetchHiddenTabs(user.id);
    }
  }, [user?.id, fetchHiddenTabs]);

  return {
    hiddenTabs,
    loading,
    isTabHidden,
    isTabVisible,
    refetch
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
