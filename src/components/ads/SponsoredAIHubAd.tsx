import { useEffect, useState } from 'react';
import { useAdAuction } from '@/hooks/useAdAuction';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SponsoredAIHubAdProps {
  service?: string;
  className?: string;
}

export const SponsoredAIHubAd = ({ service, className }: SponsoredAIHubAdProps) => {
  const navigate = useNavigate();
  const { runAuction, recordImpression, recordClick, loading } = useAdAuction();
  const { trackAdImpression, trackAdClick } = useBehaviorTracking();
  const [ad, setAd] = useState<any>(null);
  const [auctionId, setAuctionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAd = async () => {
      const result = await runAuction('ai_hub', 1, { searchQuery: service });
      if (result.ads.length > 0) {
        const winningAd = result.ads[0];
        setAd(winningAd);
        setAuctionId(result.auction_id || null);

        // Record impression
        recordImpression(
          winningAd.id,
          winningAd.creative?.id || null,
          'ai_hub',
          result.auction_id || null,
          winningAd.bid_amount,
          winningAd.retargeting_boost || 1.0
        );
        trackAdImpression(winningAd.id, 'ai_hub', 0);
      }
    };

    fetchAd();
  }, [service]);

  const handleClick = () => {
    if (!ad) return;

    recordClick(ad.id, ad.creative?.id || null, 'ai_hub');
    trackAdClick(ad.id, 'ai_hub');

    // Navigate to product
    navigate(`/product/${ad.product_id}`);
  };

  if (loading || !ad) return null;

  return (
    <Card className={`overflow-hidden border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-pink-500/5 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={ad.product?.image_url || ad.creative?.primary_image_url || '/placeholder.svg'}
              alt={ad.product?.name}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <Badge className="absolute -top-1 -right-1 text-[10px] px-1 py-0 bg-purple-600">
              <Sparkles className="w-2 h-2 mr-0.5" />
              Ad
            </Badge>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {ad.creative?.headline || ad.product?.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {ad.creative?.description || 'Great deal for you!'}
            </p>
            {ad.product?.price && (
              <p className="text-sm font-bold text-purple-500 mt-0.5">
                ₱{ad.product.price.toFixed(2)}
              </p>
            )}
          </div>
          <Button size="sm" onClick={handleClick} className="shrink-0">
            <ExternalLink className="w-3 h-3 mr-1" />
            {ad.creative?.cta_text || 'Shop'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
