import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAdAuction } from '@/hooks/useAdAuction';

interface SponsoredInlineAdProps {
  placementKey: string;
  className?: string;
}

export const SponsoredInlineAd = ({ placementKey, className = '' }: SponsoredInlineAdProps) => {
  const navigate = useNavigate();
  const { runAuction, recordImpression, recordClick } = useAdAuction();
  const [ad, setAd] = useState<any>(null);
  const [auctionId, setAuctionId] = useState<string>();
  const hasRecordedImpression = useRef(false);

  useEffect(() => {
    const loadAd = async () => {
      const result = await runAuction(placementKey, 1);
      if (result.ads.length > 0) {
        setAd(result.ads[0]);
        setAuctionId(result.auction_id);
      }
    };
    loadAd();
  }, [placementKey]);

  useEffect(() => {
    if (ad && !hasRecordedImpression.current) {
      hasRecordedImpression.current = true;
      recordImpression(
        ad.id,
        ad.creative?.id || null,
        placementKey,
        auctionId || null,
        ad.bid_amount,
        ad.retargeting_boost
      );
    }
  }, [ad, placementKey, auctionId, recordImpression]);

  if (!ad) return null;

  const handleClick = () => {
    recordClick(ad.id, ad.creative?.id || null, placementKey);
    navigate(`/shop/product/${ad.product_id}`);
  };

  const product = ad.product;
  const creative = ad.creative;

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <Badge 
        variant="secondary" 
        className="absolute top-2 left-2 z-10 text-[10px] px-1.5 py-0.5"
      >
        Sponsored
      </Badge>
      
      <div className="flex gap-4 p-4">
        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={creative?.primary_image_url || product?.images?.[0] || '/placeholder.svg'}
            alt={creative?.headline || product?.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-1 mb-1">
            {creative?.headline || product?.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {creative?.description || 'Check out this great deal!'}
          </p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-primary">
              ₱{product?.price?.toLocaleString() || '0'}
            </span>
            <Button size="sm" onClick={handleClick}>
              {creative?.cta_text || 'Shop Now'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
