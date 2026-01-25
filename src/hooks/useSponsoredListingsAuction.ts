import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SponsoredListing {
  id: string;
  listing_id: string;
  listing_type: string;
  listing_title: string;
  listing_image_url?: string;
  budget_amount: number;
  daily_budget: number;
  impressions_delivered: number;
  total_impressions_target: number;
  priority_score: number;
  boost_multiplier: number;
  ctr: number;
}

export const useSponsoredListingsAuction = () => {
  // Facebook-like ad auction algorithm
  const calculatePriorityScore = useCallback((
    budget: number,
    dailyBudget: number,
    impressionsDelivered: number,
    impressionsTarget: number,
    ctr: number,
    boostMultiplier: number
  ): number => {
    // Delivery pacing - prioritize ads that are behind schedule
    let deliveryPacing = 1;
    if (impressionsTarget > 0) {
      deliveryPacing = Math.max(0.1, 1 - (impressionsDelivered / impressionsTarget));
    }
    
    // Performance score based on CTR (click-through rate)
    const performanceScore = Math.max(0.1, (ctr || 0) * 10 + 0.5);
    
    // Budget score - higher daily budget = higher priority
    const budgetScore = Math.min(2.0, dailyBudget / 100);
    
    // Randomness factor to prevent same ads always winning
    const randomFactor = 0.8 + (Math.random() * 0.4);
    
    return deliveryPacing * performanceScore * budgetScore * (boostMultiplier || 1) * randomFactor;
  }, []);

  // Get sponsored listings for a specific placement
  const getSponsoredListings = useCallback(async (
    listingType: 'marketplace' | 'restaurant' | 'auction' | 'food_item' | 'all',
    limit: number = 5,
    userId?: string,
    visitorId?: string
  ): Promise<SponsoredListing[]> => {
    try {
      let query = supabase
        .from('sponsored_listings')
        .select('*')
        .eq('status', 'active')
        .gt('budget_amount', 0)
        .order('priority_score', { ascending: false });
      
      if (listingType !== 'all') {
        query = query.eq('listing_type', listingType);
      }

      const { data, error } = await query.limit(limit * 2); // Get more to allow for filtering

      if (error) throw error;
      if (!data?.length) return [];

      // Calculate real-time priority scores
      const scoredListings = data.map(listing => ({
        ...listing,
        calculatedScore: calculatePriorityScore(
          listing.budget_amount,
          listing.daily_budget,
          listing.impressions_delivered || 0,
          listing.total_impressions_target || 1000,
          listing.ctr || 0,
          listing.boost_multiplier || 1
        )
      }));

      // Sort by calculated score and take top results
      scoredListings.sort((a, b) => b.calculatedScore - a.calculatedScore);
      const winners = scoredListings.slice(0, limit);

      // Record impressions for winning ads
      if (winners.length > 0) {
        const impressionRecords = winners.map(listing => ({
          sponsored_listing_id: listing.id,
          user_id: userId || null,
          visitor_id: visitorId || null,
          placement_key: listingType,
          device_type: typeof window !== 'undefined' ? 
            (window.innerWidth < 768 ? 'mobile' : 'desktop') : 'unknown'
        }));

        await supabase.from('sponsored_listing_impressions').insert(impressionRecords);

        // Update impression counts
        for (const listing of winners) {
          await supabase
            .from('sponsored_listings')
            .update({ 
              impressions_delivered: (listing.impressions_delivered || 0) + 1,
              last_impression_at: new Date().toISOString()
            })
            .eq('id', listing.id);
        }
      }

      return winners;
    } catch (error) {
      console.error('Error fetching sponsored listings:', error);
      return [];
    }
  }, [calculatePriorityScore]);

  // Record a click on a sponsored listing
  const recordClick = useCallback(async (
    sponsoredListingId: string,
    impressionId?: string
  ): Promise<void> => {
    try {
      // Update impression record
      if (impressionId) {
        await supabase
          .from('sponsored_listing_impressions')
          .update({ is_clicked: true, clicked_at: new Date().toISOString() })
          .eq('id', impressionId);
      }

      // Update click count and CTR
      const { data: listing } = await supabase
        .from('sponsored_listings')
        .select('clicks, impressions_delivered')
        .eq('id', sponsoredListingId)
        .single();

      if (listing) {
        const newClicks = (listing.clicks || 0) + 1;
        const impressions = listing.impressions_delivered || 1;
        const newCtr = newClicks / impressions;

        await supabase
          .from('sponsored_listings')
          .update({ 
            clicks: newClicks,
            ctr: newCtr
          })
          .eq('id', sponsoredListingId);
      }
    } catch (error) {
      console.error('Error recording click:', error);
    }
  }, []);

  // Check if an ad has reached its impression cap for today
  const checkDailyCap = useCallback(async (sponsoredListingId: string): Promise<boolean> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { count } = await supabase
        .from('sponsored_listing_impressions')
        .select('*', { count: 'exact', head: true })
        .eq('sponsored_listing_id', sponsoredListingId)
        .gte('created_at', today);

      const { data: listing } = await supabase
        .from('sponsored_listings')
        .select('daily_impression_cap')
        .eq('id', sponsoredListingId)
        .single();

      return (count || 0) >= (listing?.daily_impression_cap || 100);
    } catch (error) {
      return false;
    }
  }, []);

  return {
    getSponsoredListings,
    recordClick,
    checkDailyCap,
    calculatePriorityScore
  };
};