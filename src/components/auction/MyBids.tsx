import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp, Clock, Trophy, AlertTriangle,
  CreditCard, Package, MessageSquare
} from "lucide-react";
import { format, formatDistanceToNow, differenceInSeconds } from "date-fns";
import AuctionEscrowDialog from "./AuctionEscrowDialog";

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  auction: {
    id: string;
    title: string;
    images: string[];
    current_bid: number;
    current_bidder_id: string;
    ends_at: string;
    status: string;
    seller: {
      full_name: string;
    };
  };
}

interface WonAuction {
  id: string;
  title: string;
  images: string[];
  winning_bid: number;
  seller_id: string;
  escrow: any;
  seller: {
    full_name: string;
  };
}

const MyBids = () => {
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedEscrow, setSelectedEscrow] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchBids();
      fetchWonAuctions();
    }
  }, [user]);

  const fetchBids = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("auction_bids")
      .select(`
        id, amount, created_at,
        auction:auctions(
          id, title, images, current_bid, current_bidder_id, ends_at, status,
          seller:profiles!auctions_seller_id_fkey(full_name)
        )
      `)
      .eq("bidder_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      // Group by auction, keep highest bid per auction
      const auctionMap = new Map<string, Bid>();
      (data as any[]).forEach(bid => {
        const existing = auctionMap.get(bid.auction.id);
        if (!existing || bid.amount > existing.amount) {
          auctionMap.set(bid.auction.id, bid);
        }
      });
      setBids(Array.from(auctionMap.values()));
    }
    setLoading(false);
  };

  const fetchWonAuctions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("auctions")
      .select(`
        id, title, images, winning_bid, seller_id,
        seller:profiles!auctions_seller_id_fkey(full_name),
        escrow:auction_escrow(*)
      `)
      .eq("winner_id", user.id)
      .eq("status", "sold");

    if (data) {
      setWonAuctions(data.map(a => ({ ...a, escrow: (a.escrow as any)?.[0] })) as any);
    }
  };

  const activeBids = bids.filter(b => b.auction.status === "active");
  const outbidBids = activeBids.filter(b =>
    b.auction.current_bidder_id !== user?.id
  );
  const winningBids = activeBids.filter(b =>
    b.auction.current_bidder_id === user?.id
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">My Bids</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Active ({activeBids.length})
          </TabsTrigger>
          <TabsTrigger value="winning" className="gap-2">
            <Trophy className="h-4 w-4 text-green-500" />
            Winning ({winningBids.length})
          </TabsTrigger>
          <TabsTrigger value="outbid" className="gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Outbid ({outbidBids.length})
          </TabsTrigger>
          <TabsTrigger value="won" className="gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Won ({wonAuctions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <BidList bids={activeBids} userId={user?.id} />
        </TabsContent>

        <TabsContent value="winning" className="mt-4">
          <BidList bids={winningBids} userId={user?.id} />
        </TabsContent>

        <TabsContent value="outbid" className="mt-4">
          <BidList bids={outbidBids} userId={user?.id} showOutbidAlert />
        </TabsContent>

        <TabsContent value="won" className="mt-4">
          {wonAuctions.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No won auctions yet</h3>
              <p className="text-muted-foreground">
                Keep bidding to win amazing items!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {wonAuctions.map((auction) => (
                <Card key={auction.id} className="p-4">
                  <div className="flex gap-4">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={auction.images?.[0] || "/placeholder.svg"}
                        alt={auction.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{auction.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Seller: {auction.seller?.full_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-500">
                            ₱{auction.winning_bid?.toLocaleString()}
                          </p>
                          <Badge className="bg-green-500 text-white">
                            <Trophy className="h-3 w-3 mr-1" />
                            Won
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {auction.escrow ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedEscrow(auction.escrow)}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            {auction.escrow.status === "pending_payment" ? "Pay Now" : "View Order"}
                          </Button>
                        ) : (
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Complete Payment
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message Seller
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AuctionEscrowDialog
        escrow={selectedEscrow}
        open={!!selectedEscrow}
        onOpenChange={(open) => !open && setSelectedEscrow(null)}
        onUpdate={() => {
          fetchBids();
          fetchWonAuctions();
        }}
        isSeller={false}
      />
    </div>
  );
};

const BidList = ({
  bids,
  userId,
  showOutbidAlert = false
}: {
  bids: Bid[];
  userId?: string;
  showOutbidAlert?: boolean;
}) => {
  if (bids.length === 0) {
    return (
      <Card className="p-12 text-center">
        <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">No bids found</h3>
        <p className="text-muted-foreground">
          Start bidding on items you love!
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {bids.map((bid) => {
        const isWinning = bid.auction.current_bidder_id === userId;
        const endDate = new Date(bid.auction.ends_at);
        const now = new Date();
        const secondsLeft = differenceInSeconds(endDate, now);
        const isEnding = secondsLeft > 0 && secondsLeft < 3600;

        return (
          <Card key={bid.id} className={`p-4 ${showOutbidAlert ? "border-red-500/50" : ""}`}>
            <div className="flex gap-4">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={bid.auction.images?.[0] || "/placeholder.svg"}
                  alt={bid.auction.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{bid.auction.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Seller: {bid.auction.seller?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-amber-500">
                      ₱{bid.auction.current_bid?.toLocaleString()}
                    </p>
                    {isWinning ? (
                      <Badge className="bg-green-500 text-white">
                        <Trophy className="h-3 w-3 mr-1" />
                        Highest Bidder
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Outbid
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span>Your bid: ₱{bid.amount.toLocaleString()}</span>
                  <span className={`flex items-center gap-1 ${isEnding ? "text-red-500 font-medium" : ""}`}>
                    <Clock className="h-4 w-4" />
                    {secondsLeft > 0
                      ? `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`
                      : "Ended"
                    }
                  </span>
                </div>

                {showOutbidAlert && (
                  <div className="mt-3">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Bid Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MyBids;
