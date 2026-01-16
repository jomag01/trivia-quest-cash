import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAdAuction } from '@/hooks/useAdAuction';

interface SponsoredProductCardProps {
  sponsoredProduct: {
    id: string;
    product_id: string;
    bid_amount: number;
    final_score?: number;
    retargeting_boost?: number;
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
      images: string[];
    };
  };
  placement: string;
  auctionId?: string;
  position: number;
  onClick?: () => void;
}

export const SponsoredProductCard = ({
  sponsoredProduct,
  placement,
  auctionId,
  position,
  onClick,
}: SponsoredProductCardProps) => {
  const { recordImpression, recordClick } = useAdAuction();
  const hasRecordedImpression = useRef(false);

  useEffect(() => {
    if (!hasRecordedImpression.current && sponsoredProduct.id) {
      hasRecordedImpression.current = true;
      recordImpression(
        sponsoredProduct.id,
        sponsoredProduct.creative?.id || null,
        placement,
        auctionId || null,
        sponsoredProduct.bid_amount,
        sponsoredProduct.retargeting_boost
      );
    }
  }, [sponsoredProduct.id, placement, auctionId, recordImpression]);

  const handleClick = () => {
    recordClick(
      sponsoredProduct.id,
      sponsoredProduct.creative?.id || null,
      placement
    );
    onClick?.();
  };

  const product = sponsoredProduct.product;
  const creative = sponsoredProduct.creative;
  const imageUrl = creative?.primary_image_url || (product as any)?.image_url || '/placeholder.svg';
  const name = creative?.headline || product?.name || 'Sponsored Product';
  const price = product?.price || 0;

  return (
    <Card 
      className="relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] group"
      onClick={handleClick}
    >
      <Badge 
        variant="secondary" 
        className="absolute top-2 left-2 z-10 text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm"
      >
        Sponsored
      </Badge>
      
      <div className="aspect-square relative overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-1">
          {name}
        </h3>
        {creative?.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {creative.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold text-primary">
            ₱{price.toLocaleString()}
          </span>
          <span className="text-xs text-primary font-medium">
            {creative?.cta_text || 'Shop Now'}
          </span>
        </div>
      </div>
    </Card>
  );
};
