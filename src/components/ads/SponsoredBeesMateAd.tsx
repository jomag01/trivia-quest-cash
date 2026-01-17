import { useEffect, useState } from 'react';
import { useAdAuction } from '@/hooks/useAdAuction';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SponsoredBeesMateAdProps {
  className?: string;
}

export const SponsoredBeesMateAd = ({ className }: SponsoredBeesMateAdProps) => {
  const navigate = useNavigate();
  const { runAuction, recordImpression, recordClick, loading } = useAdAuction();
  const { trackAdImpression, trackAdClick } = useBehaviorTracking();
  const [ads, setAds] = useState<any[]>([]);
  const [auctionId, setAuctionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAds = async () => {
      const result = await runAuction('beesmate', 3);
      if (result.ads.length > 0) {
        setAds(result.ads);
        setAuctionId(result.auction_id || null);

        // Record impressions
        result.ads.forEach((ad, index) => {
          recordImpression(
            ad.id,
            ad.creative?.id || null,
            'beesmate',
            result.auction_id || null,
            ad.bid_amount,
            ad.retargeting_boost || 1.0
          );
          trackAdImpression(ad.id, 'beesmate', index);
        });
      }
    };

    fetchAds();
  }, []);

  const handleClick = (ad: any) => {
    recordClick(ad.id, ad.creative?.id || null, 'beesmate');
    trackAdClick(ad.id, 'beesmate');
    navigate(`/product/${ad.product_id}`);
  };

  if (loading || ads.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-pink-500" />
        <span className="text-sm font-medium text-muted-foreground">You might like</span>
        <Badge variant="outline" className="text-[10px]">Sponsored</Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {ads.map((ad) => (
          <Card 
            key={ad.id}
            className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
            onClick={() => handleClick(ad)}
          >
            <CardContent className="p-2">
              <div className="relative aspect-square mb-2">
                <img
                  src={ad.product?.image_url || '/placeholder.svg'}
                  alt={ad.product?.name}
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="w-6 h-6">
                    <Heart className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-xs font-medium truncate">{ad.product?.name}</p>
              {ad.product?.price && (
                <p className="text-sm font-bold text-pink-500">
                  ₱{ad.product.price.toFixed(0)}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
