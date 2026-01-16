import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdAuction } from '@/hooks/useAdAuction';
import { SponsoredProductCard } from './SponsoredProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface SponsoredProductsGridProps {
  placementKey: string;
  maxAds?: number;
  className?: string;
  context?: {
    categoryId?: string;
    searchQuery?: string;
    productIds?: string[];
  };
}

export const SponsoredProductsGrid = ({
  placementKey,
  maxAds = 4,
  className = '',
  context,
}: SponsoredProductsGridProps) => {
  const navigate = useNavigate();
  const { runAuction, loading } = useAdAuction();
  const [ads, setAds] = useState<any[]>([]);
  const [auctionId, setAuctionId] = useState<string>();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const loadAds = async () => {
      const result = await runAuction(placementKey, maxAds, context);
      setAds(result.ads);
      setAuctionId(result.auction_id);
      setHasLoaded(true);
    };
    loadAds();
  }, [placementKey, maxAds, context?.categoryId, context?.searchQuery]);

  if (loading && !hasLoaded) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: maxAds }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {ads.map((ad, index) => (
        <SponsoredProductCard
          key={ad.id}
          sponsoredProduct={ad}
          placement={placementKey}
          auctionId={auctionId}
          position={index}
          onClick={() => navigate(`/shop/product/${ad.product_id}`)}
        />
      ))}
    </div>
  );
};
