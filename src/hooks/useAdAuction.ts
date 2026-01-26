import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SponsoredProduct {
  id: string;
  product_id: string;
  seller_id: string;
  bid_amount: number;
  quality_score: number;
  relevance_score: number;
  conversion_rate: number;
  creative?: {
    id: string;
    headline: string;
    description: string;
    cta_text: string;
    primary_image_url: string;
  };
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    seller_id: string;
  };
  final_score?: number;
  retargeting_boost?: number;
}

interface AuctionResult {
  ads: SponsoredProduct[];
  auction_id?: string;
}

const getVisitorId = (): string => {
  return localStorage.getItem('tb_visitor_id') || '';
};

export const useAdAuction = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const runAuction = useCallback(async (
    placementKey: string,
    maxAds: number = 5,
    context?: {
      categoryId?: string;
      searchQuery?: string;
      productIds?: string[];
    }
  ): Promise<AuctionResult> => {
    setLoading(true);
    const startTime = Date.now();

    try {
      const visitorId = getVisitorId();

      // 1. Fetch active sponsored products with impression tracking
      const { data: sponsoredProducts, error } = await supabase
        .from('sponsored_products')
        .select('id, product_id, seller_id, bid_amount, quality_score, relevance_score, conversion_rate, daily_budget, spent_amount, frequency_cap, placements, impressions_allocated, impressions_remaining, cost_per_impression, delivery_status')
        .eq('status', 'active')
        .gt('daily_budget', 0);

      if (error || !sponsoredProducts?.length) {
        setLoading(false);
        return { ads: [] };
      }

      // 2. Filter by placement and check impressions remaining
      const feedPlacements = ['feed', 'homepage_feed', 'beesmate', 'aihub', 'shop'];
      const eligibleProducts = sponsoredProducts.filter(sp => {
        const adPlacements = sp.placements as string[] || [];
        const hasPlacement = adPlacements.includes(placementKey) || 
               adPlacements.includes('all') ||
               (feedPlacements.includes(placementKey) && adPlacements.includes('feed'));
        
        // Check if ad still has impressions remaining (Facebook-like delivery)
        const impressionsRemaining = (sp as any).impressions_remaining ?? Infinity;
        const deliveryStatus = (sp as any).delivery_status;
        const hasImpressionsLeft = impressionsRemaining > 0 && deliveryStatus !== 'exhausted';
        
        return hasPlacement && hasImpressionsLeft;
      });

      if (!eligibleProducts.length) {
        setLoading(false);
        return { ads: [] };
      }

      // 3. Calculate scores
      const scoredProducts = eligibleProducts
        .map(sp => {
          const finalScore = (sp.bid_amount as number) * ((sp.quality_score as number) || 5) * 0.01;
          return { ...sp, final_score: finalScore, retargeting_boost: 1.0 };
        })
        .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
        .slice(0, maxAds);

      // 4. Fetch product details for product-based ads
      const productIds = scoredProducts.filter(sp => sp.product_id).map(sp => sp.product_id);
      const userAdIds = scoredProducts.filter(sp => !sp.product_id).map(sp => sp.id);
      
      const { data: products } = productIds.length ? await supabase
        .from('products')
        .select('id, name, seller_id, image_url')
        .in('id', productIds) : { data: [] };

      // Fetch user_ads data for standalone ads (no product_id)
      const { data: userAds } = userAdIds.length ? await supabase
        .from('user_ads')
        .select('id, title, description, image_url, link_url')
        .in('id', userAdIds) : { data: [] };

      const productsMap = new Map((products || []).map(p => [p.id, p]));
      const userAdsMap = new Map((userAds || []).map(ua => [ua.id, ua]));

      const adsWithDetails: SponsoredProduct[] = scoredProducts
        .map(sp => {
          const product = sp.product_id ? productsMap.get(sp.product_id) : null;
          const userAd = !sp.product_id ? userAdsMap.get(sp.id) : null;
          
          // Skip ads with no valid image source
          const imageUrl = product?.image_url || userAd?.image_url;
          if (!imageUrl) {
            return null;
          }
          
          return {
            id: sp.id,
            product_id: sp.product_id,
            seller_id: sp.seller_id,
            bid_amount: sp.bid_amount as number,
            quality_score: (sp.quality_score as number) || 5,
            relevance_score: (sp.relevance_score as number) || 5,
            conversion_rate: (sp.conversion_rate as number) || 0,
            final_score: sp.final_score,
            retargeting_boost: sp.retargeting_boost,
            product: product ? {
              id: product.id,
              name: product.name,
              price: 0,
              image_url: product.image_url || '',
              seller_id: product.seller_id,
            } : userAd ? {
              id: sp.id,
              name: userAd.title || 'Sponsored',
              price: 0,
              image_url: userAd.image_url || '',
              seller_id: sp.seller_id,
            } : undefined,
            creative: {
              id: sp.id,
              headline: product?.name || userAd?.title || 'Shop Now',
              description: userAd?.description || 'Great deal!',
              cta_text: 'Shop Now',
              primary_image_url: imageUrl,
            },
          };
        })
        .filter((ad): ad is NonNullable<typeof ad> => ad !== null);

      // 5. Log auction
      const latencyMs = Date.now() - startTime;
      const { data: auctionLog } = await supabase
        .from('ad_auction_logs')
        .insert({
          placement_key: placementKey,
          user_id: user?.id || null,
          visitor_id: visitorId || null,
          winning_ad_id: adsWithDetails[0]?.id || null,
          winning_score: adsWithDetails[0]?.final_score || null,
          participating_ads: eligibleProducts.length,
          latency_ms: latencyMs,
        })
        .select('id')
        .single();

      setLoading(false);
      return { ads: adsWithDetails, auction_id: auctionLog?.id };
    } catch (error) {
      console.error('Ad auction error:', error);
      setLoading(false);
      return { ads: [] };
    }
  }, [user]);

  const recordImpression = useCallback(async (
    sponsoredProductId: string,
    creativeId: string | null,
    placementKey: string,
    auctionId: string | null,
    bidAmount: number,
    retargetingBoost: number = 1.0
  ) => {
    try {
      // Record detailed impression
      await supabase.from('ad_impression_details').insert({
        sponsored_product_id: sponsoredProductId,
        creative_id: creativeId,
        placement_key: placementKey,
        user_id: user?.id || null,
        visitor_id: getVisitorId(),
        auction_id: auctionId,
        bid_amount: bidAmount,
        actual_cost: bidAmount * 0.01,
        retargeting_boost: retargetingBoost,
      });

      // Increment impressions and decrement remaining (Facebook-like delivery)
      const { data: current } = await supabase
        .from('sponsored_products')
        .select('impressions, impressions_remaining, impressions_allocated, cost_per_impression')
        .eq('id', sponsoredProductId)
        .single();
      
      const newImpressions = (current?.impressions || 0) + 1;
      const newRemaining = Math.max((current?.impressions_remaining || 0) - 1, 0);
      const newSpent = newImpressions * (current?.cost_per_impression || 0);
      
      // Auto-pause when impressions exhausted
      const deliveryStatus = newRemaining <= 0 ? 'exhausted' : 'delivering';
      const newStatus = newRemaining <= 0 ? 'paused' : undefined;
      
      const updateData: any = { 
        impressions: newImpressions,
        impressions_remaining: newRemaining,
        spent_amount: newSpent,
        delivery_status: deliveryStatus
      };
      
      if (newStatus) {
        updateData.status = newStatus;
      }
      
      await supabase
        .from('sponsored_products')
        .update(updateData)
        .eq('id', sponsoredProductId);
    } catch (error) {
      console.error('Error recording impression:', error);
    }
  }, [user]);

  const recordClick = useCallback(async (
    sponsoredProductId: string,
    creativeId: string | null,
    placementKey: string
  ) => {
    try {
      await supabase
        .from('ad_impression_details')
        .update({ is_clicked: true })
        .eq('sponsored_product_id', sponsoredProductId)
        .eq('placement_key', placementKey);

      // Increment clicks count on sponsored_products for real-time sync
      const { data: current } = await supabase
        .from('sponsored_products')
        .select('clicks')
        .eq('id', sponsoredProductId)
        .single();
      
      await supabase
        .from('sponsored_products')
        .update({ clicks: (current?.clicks || 0) + 1 })
        .eq('id', sponsoredProductId);
    } catch (error) {
      console.error('Error recording click:', error);
    }
  }, []);

  return { runAuction, recordImpression, recordClick, loading };
};
