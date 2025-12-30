import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gavel, Clock, Eye, Users, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInHours, differenceInMinutes } from "date-fns";

interface Auction {
  id: string;
  title: string;
  current_bid: number | null;
  starting_bid: number;
  ends_at: string;
  images: string[] | null;
  views: number | null;
  watchers: number | null;
  bid_count: number | null;
  buy_now_price: number | null;
}

const AuctionProducts = () => {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const { data, error } = await supabase
        .from("auctions")
        .select("id, title, current_bid, starting_bid, ends_at, images, views, watchers, bid_count, buy_now_price")
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("ends_at", { ascending: true })
        .limit(6);

      if (error) throw error;
      setAuctions(data || []);
    } catch (error) {
      console.error("Error fetching auctions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const hoursLeft = differenceInHours(end, now);
    const minutesLeft = differenceInMinutes(end, now) % 60;

    if (hoursLeft < 1) {
      return { text: `${minutesLeft}m left`, urgent: true };
    } else if (hoursLeft < 24) {
      return { text: `${hoursLeft}h ${minutesLeft}m left`, urgent: true };
    } else {
      return { text: formatDistanceToNow(end, { addSuffix: false }) + " left", urgent: false };
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            Live Auctions
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (auctions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Gavel className="w-5 h-5 text-primary" />
          Live Auctions
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary gap-1"
          onClick={() => navigate("/auction")}
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {auctions.map((auction) => {
          const timeInfo = getTimeRemaining(auction.ends_at);
          const currentPrice = auction.current_bid || auction.starting_bid;
          const imageUrl = auction.images?.[0];

          return (
            <Card
              key={auction.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 group"
              onClick={() => navigate("/auction")}
            >
              <div className="relative aspect-square bg-muted">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={auction.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gavel className="w-12 h-12 text-muted-foreground/30" />
                  </div>
                )}

                {/* Time Badge */}
                <Badge
                  className={`absolute top-2 left-2 text-[10px] gap-1 ${
                    timeInfo.urgent
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-background/90 text-foreground"
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {timeInfo.text}
                </Badge>

                {/* Bids Badge */}
                {(auction.bid_count ?? 0) > 0 && (
                  <Badge className="absolute top-2 right-2 text-[10px] bg-primary/90">
                    {auction.bid_count} bids
                  </Badge>
                )}

                {/* Stats */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-[9px] gap-1 bg-background/80">
                    <Eye className="w-2.5 h-2.5" />
                    {auction.views || 0}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] gap-1 bg-background/80">
                    <Users className="w-2.5 h-2.5" />
                    {auction.watchers || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <h3 className="font-medium text-sm line-clamp-1">{auction.title}</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      Current Bid
                    </p>
                    <p className="font-bold text-primary">₱{currentPrice.toLocaleString()}</p>
                  </div>
                  
                  {auction.buy_now_price && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Buy Now</p>
                      <p className="text-sm font-semibold text-green-600">
                        ₱{auction.buy_now_price.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default AuctionProducts;
