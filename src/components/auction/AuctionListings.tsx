import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, Eye, Users, Gavel, Heart, 
  TrendingUp, Flame, Zap, Shield, Star
} from "lucide-react";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import AuctionDetailDialog from "./AuctionDetailDialog";

interface AuctionListingsProps {
  category: string;
  searchQuery: string;
}

interface Auction {
  id: string;
  title: string;
  description: string;
  condition: string;
  starting_bid: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  current_bid: number;
  current_bidder_id: string | null;
  bid_count: number;
  ends_at: string;
  status: string;
  images: string[];
  views: number;
  watchers: number;
  featured: boolean;
  shipping_fee: number;
  seller: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  category: {
    name: string;
    color: string;
  } | null;
}

const AuctionListings = ({ category, searchQuery }: AuctionListingsProps) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);

  useEffect(() => {
    fetchAuctions();

    // Real-time subscription for bid updates
    const channel = supabase
      .channel("auction-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auctions" },
        () => fetchAuctions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category, searchQuery]);

  const fetchAuctions = async () => {
    let query = supabase
      .from("auctions")
      .select(`
        *,
        seller:profiles!auctions_seller_id_fkey(id, full_name, avatar_url),
        category:auction_categories(name, color)
      `)
      .eq("status", "active")
      .order("featured", { ascending: false })
      .order("ends_at", { ascending: true });

    if (category === "ending-soon") {
      const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      query = query.lt("ends_at", soon);
    } else if (category === "hot") {
      query = query.gte("bid_count", 5);
    } else if (category !== "all") {
      const { data: cat } = await supabase
        .from("auction_categories")
        .select("id")
        .eq("slug", category)
        .single();
      if (cat) {
        query = query.eq("category_id", cat.id);
      }
    }

    if (searchQuery) {
      query = query.ilike("title", `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (data) {
      setAuctions(data as any);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-square" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (auctions.length === 0) {
    return (
      <div className="text-center py-12">
        <Gavel className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No auctions found</h3>
        <p className="text-muted-foreground">
          Check back later for new listings
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {auctions.map((auction) => (
          <AuctionCard
            key={auction.id}
            auction={auction}
            onClick={() => setSelectedAuction(auction)}
          />
        ))}
      </div>

      <AuctionDetailDialog
        auction={selectedAuction}
        open={!!selectedAuction}
        onOpenChange={(open) => !open && setSelectedAuction(null)}
      />
    </>
  );
};

const AuctionCard = ({ 
  auction, 
  onClick 
}: { 
  auction: Auction; 
  onClick: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date(auction.ends_at);
      const seconds = differenceInSeconds(end, now);

      if (seconds <= 0) {
        setTimeLeft("Ended");
        return;
      }

      setIsUrgent(seconds < 3600); // Less than 1 hour

      if (seconds < 60) {
        setTimeLeft(`${seconds}s`);
      } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setTimeLeft(`${mins}m ${secs}s`);
      } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        setTimeLeft(`${hours}h ${mins}m`);
      } else {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        setTimeLeft(`${days}d ${hours}h`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction.ends_at]);

  const currentPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;
  const hasReserve = auction.reserve_price && auction.current_bid < auction.reserve_price;

  return (
    <Card 
      className="group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-amber-500/50"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={auction.images?.[0] || "/placeholder.svg"}
          alt={auction.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {auction.featured && (
            <Badge className="bg-amber-500 text-white text-xs">
              <Star className="h-3 w-3 mr-1" />
              Featured
            </Badge>
          )}
          {auction.bid_count >= 5 && (
            <Badge className="bg-red-500 text-white text-xs">
              <Flame className="h-3 w-3 mr-1" />
              Hot
            </Badge>
          )}
          {auction.buy_now_price && (
            <Badge className="bg-green-500 text-white text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Buy Now
            </Badge>
          )}
        </div>

        {/* Timer */}
        <div className={`absolute bottom-2 right-2 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
          isUrgent 
            ? "bg-red-500 text-white animate-pulse" 
            : "bg-black/70 text-white"
        }`}>
          <Clock className="h-3 w-3" />
          {timeLeft}
        </div>

        {/* Category */}
        {auction.category && (
          <Badge 
            className="absolute top-2 right-2 text-xs"
            style={{ backgroundColor: `var(--${auction.category.color}-500, #f59e0b)` }}
          >
            {auction.category.name}
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-amber-500 transition-colors">
          {auction.title}
        </h3>

        {/* Current Bid */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current Bid</p>
            <p className="text-lg font-bold text-amber-500">
              ₱{currentPrice.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{auction.bid_count} bids</p>
            {hasReserve && (
              <p className="text-xs text-red-500">Reserve not met</p>
            )}
          </div>
        </div>

        {/* Buy Now */}
        {auction.buy_now_price && (
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-xs text-muted-foreground">Buy Now</span>
            <span className="text-sm font-semibold text-green-500">
              ₱{auction.buy_now_price.toLocaleString()}
            </span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {auction.views}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {auction.watchers}
          </span>
          <Badge variant="outline" className="text-xs ml-auto">
            {auction.condition.replace("_", " ")}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default AuctionListings;
