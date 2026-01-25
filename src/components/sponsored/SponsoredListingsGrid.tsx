import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { useSponsoredListingsAuction } from "@/hooks/useSponsoredListingsAuction";
import { useAuth } from "@/contexts/AuthContext";

interface SponsoredListingsGridProps {
  listingType: 'marketplace' | 'restaurant' | 'auction' | 'food_item' | 'all';
  limit?: number;
  onListingClick?: (listingId: string, listingType: string) => void;
  className?: string;
}

export const SponsoredListingsGrid = ({
  listingType,
  limit = 4,
  onListingClick,
  className = ""
}: SponsoredListingsGridProps) => {
  const { user } = useAuth();
  const { getSponsoredListings, recordClick } = useSponsoredListingsAuction();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      const visitorId = localStorage.getItem('visitor_id') || `v_${Date.now()}`;
      const results = await getSponsoredListings(listingType, limit, user?.id, visitorId);
      setListings(results);
      setLoading(false);
    };

    fetchListings();
  }, [listingType, limit, user?.id, getSponsoredListings]);

  const handleClick = async (listing: any) => {
    await recordClick(listing.id);
    onListingClick?.(listing.listing_id, listing.listing_type);
  };

  if (loading || listings.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Sponsored</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {listings.map((listing) => (
          <Card 
            key={listing.id}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative group"
            onClick={() => handleClick(listing)}
          >
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 z-10 text-xs bg-primary/80 text-primary-foreground"
            >
              Sponsored
            </Badge>
            {listing.listing_image_url ? (
              <img
                src={listing.listing_image_url}
                alt={listing.listing_title}
                className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-full h-32 bg-muted flex items-center justify-center">
                <Megaphone className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="p-2">
              <p className="text-sm font-medium line-clamp-2">{listing.listing_title}</p>
              <p className="text-xs text-muted-foreground capitalize">{listing.listing_type}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};