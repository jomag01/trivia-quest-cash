import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Clock, Gavel, Trash2, Bell, BellOff } from "lucide-react";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import AuctionDetailDialog from "./AuctionDetailDialog";

interface WatchedAuction {
  id: string;
  notify_outbid: boolean;
  notify_ending: boolean;
  auction: {
    id: string;
    title: string;
    images: string[];
    current_bid: number;
    starting_bid: number;
    bid_count: number;
    ends_at: string;
    status: string;
    seller: {
      full_name: string;
    };
  };
}

const AuctionWatchlist = () => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchedAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchWatchlist();
    }
  }, [user]);

  const fetchWatchlist = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("auction_watchlist")
      .select(`
        id, notify_outbid, notify_ending,
        auction:auctions(
          id, title, images, current_bid, starting_bid, bid_count, ends_at, status,
          seller:profiles!auctions_seller_id_fkey(full_name)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setWatchlist(data.filter(w => w.auction) as any);
    }
    setLoading(false);
  };

  const removeFromWatchlist = async (watchlistId: string) => {
    const { error } = await supabase
      .from("auction_watchlist")
      .delete()
      .eq("id", watchlistId);

    if (error) {
      toast.error("Failed to remove from watchlist");
    } else {
      setWatchlist(watchlist.filter(w => w.id !== watchlistId));
      toast.success("Removed from watchlist");
    }
  };

  const toggleNotification = async (
    watchlistId: string, 
    field: "notify_outbid" | "notify_ending",
    currentValue: boolean
  ) => {
    const { error } = await supabase
      .from("auction_watchlist")
      .update({ [field]: !currentValue })
      .eq("id", watchlistId);

    if (error) {
      toast.error("Failed to update notification settings");
    } else {
      setWatchlist(watchlist.map(w => 
        w.id === watchlistId ? { ...w, [field]: !currentValue } : w
      ));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (watchlist.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Your watchlist is empty</h3>
        <p className="text-muted-foreground">
          Save auctions to watch and get notified about bid updates
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Watching ({watchlist.length})</h2>

      <div className="grid gap-4">
        {watchlist.map((item) => {
          const auction = item.auction;
          const currentPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;
          const endDate = new Date(auction.ends_at);
          const now = new Date();
          const secondsLeft = differenceInSeconds(endDate, now);
          const isEnding = secondsLeft > 0 && secondsLeft < 3600;
          const isActive = auction.status === "active";

          return (
            <Card key={item.id} className="p-4">
              <div className="flex gap-4">
                {/* Image */}
                <div 
                  className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedAuction(auction)}
                >
                  <img
                    src={auction.images?.[0] || "/placeholder.svg"}
                    alt={auction.title}
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 
                        className="font-semibold line-clamp-1 cursor-pointer hover:text-amber-500"
                        onClick={() => setSelectedAuction(auction)}
                      >
                        {auction.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {auction.seller?.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-amber-500">
                        ₱{currentPrice.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {auction.bid_count} bids
                      </p>
                    </div>
                  </div>

                  {/* Timer */}
                  <div className={`flex items-center gap-1 mt-2 text-sm ${
                    isEnding ? "text-red-500 font-medium" : "text-muted-foreground"
                  }`}>
                    <Clock className="h-4 w-4" />
                    {isActive ? (
                      secondsLeft > 0 
                        ? `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`
                        : "Ended"
                    ) : (
                      <Badge variant="secondary">{auction.status}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleNotification(item.id, "notify_outbid", item.notify_outbid)}
                    >
                      {item.notify_outbid ? (
                        <Bell className="h-4 w-4 mr-1 text-amber-500" />
                      ) : (
                        <BellOff className="h-4 w-4 mr-1" />
                      )}
                      Outbid
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleNotification(item.id, "notify_ending", item.notify_ending)}
                    >
                      {item.notify_ending ? (
                        <Bell className="h-4 w-4 mr-1 text-amber-500" />
                      ) : (
                        <BellOff className="h-4 w-4 mr-1" />
                      )}
                      Ending
                    </Button>
                    {isActive && (
                      <Button
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={() => setSelectedAuction(auction)}
                      >
                        <Gavel className="h-4 w-4 mr-1" />
                        Bid
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto text-muted-foreground hover:text-red-500"
                      onClick={() => removeFromWatchlist(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AuctionDetailDialog
        auction={selectedAuction}
        open={!!selectedAuction}
        onOpenChange={(open) => !open && setSelectedAuction(null)}
      />
    </div>
  );
};

export default AuctionWatchlist;
