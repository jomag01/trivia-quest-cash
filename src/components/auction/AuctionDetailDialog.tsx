import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Clock, Gavel, Heart, Share2, Shield, TrendingUp,
  Zap, ChevronLeft, ChevronRight, User, History,
  MessageSquare, Star, AlertTriangle, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { differenceInSeconds, format } from "date-fns";

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

interface Bid {
  id: string;
  amount: number;
  is_auto_bid: boolean;
  created_at: string;
  bidder: {
    full_name: string;
    avatar_url: string;
  };
}

interface AuctionDetailDialogProps {
  auction: Auction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AuctionDetailDialog = ({ auction, open, onOpenChange }: AuctionDetailDialogProps) => {
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [autoBidEnabled, setAutoBidEnabled] = useState(false);
  const [maxAutoBid, setMaxAutoBid] = useState("");
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [isWatched, setIsWatched] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [minBidIncrement, setMinBidIncrement] = useState(10);

  useEffect(() => {
    if (auction && open) {
      fetchBidHistory();
      checkWatchlist();
      fetchSettings();

      // Subscribe to bid updates
      const channel = supabase
        .channel(`auction-${auction.id}`)
        .on(
          "postgres_changes",
          { 
            event: "INSERT", 
            schema: "public", 
            table: "auction_bids",
            filter: `auction_id=eq.${auction.id}`
          },
          () => fetchBidHistory()
        )
        .subscribe();

      // Update timer
      const updateTimer = () => {
        const now = new Date();
        const end = new Date(auction.ends_at);
        const seconds = differenceInSeconds(end, now);

        if (seconds <= 0) {
          setTimeLeft("Auction Ended");
          return;
        }

        setIsUrgent(seconds < 3600);

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${mins}m ${secs}s`);
        } else {
          setTimeLeft(`${mins}m ${secs}s`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      // Increment view count
      incrementViews();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [auction, open]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("auction_settings")
      .select("setting_value")
      .eq("setting_key", "min_bid_increment")
      .single();
    if (data) {
      setMinBidIncrement(Number(data.setting_value) || 10);
    }
  };

  const fetchBidHistory = async () => {
    if (!auction) return;
    const { data } = await supabase
      .from("auction_bids")
      .select(`
        id, amount, is_auto_bid, created_at,
        bidder:profiles!auction_bids_bidder_id_fkey(full_name, avatar_url)
      `)
      .eq("auction_id", auction.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setBidHistory(data as any);
  };

  const checkWatchlist = async () => {
    if (!user || !auction) return;
    const { data } = await supabase
      .from("auction_watchlist")
      .select("id")
      .eq("auction_id", auction.id)
      .eq("user_id", user.id)
      .single();
    setIsWatched(!!data);
  };

  const incrementViews = async () => {
    if (!auction) return;
    // Increment views directly
    await supabase
      .from("auctions")
      .update({ views: (auction.views || 0) + 1 })
      .eq("id", auction.id);
  };

  const toggleWatchlist = async () => {
    if (!user || !auction) {
      toast.error("Please login to add to watchlist");
      return;
    }

    if (isWatched) {
      await supabase
        .from("auction_watchlist")
        .delete()
        .eq("auction_id", auction.id)
        .eq("user_id", user.id);
      setIsWatched(false);
      toast.success("Removed from watchlist");
    } else {
      await supabase
        .from("auction_watchlist")
        .insert({ auction_id: auction.id, user_id: user.id });
      setIsWatched(true);
      toast.success("Added to watchlist");
    }
  };

  const handlePlaceBid = async () => {
    if (!user || !auction) {
      toast.error("Please login to place a bid");
      return;
    }

    if (user.id === auction.seller.id) {
      toast.error("You cannot bid on your own auction");
      return;
    }

    const amount = Number(bidAmount);
    const currentPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;
    const minBid = currentPrice + minBidIncrement;

    if (amount < minBid) {
      toast.error(`Minimum bid is ₱${minBid.toLocaleString()}`);
      return;
    }

    setSubmitting(true);

    try {
      // Create bid hash for blockchain transparency
      const bidData = {
        auction_id: auction.id,
        bidder_id: user.id,
        amount,
        timestamp: new Date().toISOString()
      };
      const bidHash = await generateHash(JSON.stringify(bidData));

      // Insert bid
      const { error: bidError } = await supabase
        .from("auction_bids")
        .insert({
          auction_id: auction.id,
          bidder_id: user.id,
          amount,
          is_auto_bid: false,
          bid_hash: bidHash
        });

      if (bidError) throw bidError;

      // Update auction
      await supabase
        .from("auctions")
        .update({
          current_bid: amount,
          current_bidder_id: user.id,
          bid_count: (auction.bid_count || 0) + 1
        })
        .eq("id", auction.id);

      // Add to blockchain log
      const lastLog = await supabase
        .from("auction_blockchain_log")
        .select("data_hash")
        .eq("auction_id", auction.id)
        .order("timestamp", { ascending: false })
        .limit(1)
        .single();

      await supabase
        .from("auction_blockchain_log")
        .insert({
          auction_id: auction.id,
          action_type: "bid",
          data_hash: bidHash,
          previous_hash: lastLog.data?.data_hash || null
        });

      // Set up auto-bid if enabled
      if (autoBidEnabled && maxAutoBid) {
        await supabase
          .from("auction_auto_bids")
          .upsert({
            auction_id: auction.id,
            bidder_id: user.id,
            max_amount: Number(maxAutoBid),
            increment_amount: minBidIncrement,
            is_active: true
          });
      }

      toast.success("Bid placed successfully!");
      setBidAmount("");
      fetchBidHistory();
    } catch (error: any) {
      toast.error(error.message || "Failed to place bid");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!user || !auction || !auction.buy_now_price) return;

    if (user.id === auction.seller.id) {
      toast.error("You cannot buy your own auction");
      return;
    }

    setSubmitting(true);

    try {
      // Update auction to sold
      await supabase
        .from("auctions")
        .update({
          status: "sold",
          winner_id: user.id,
          winning_bid: auction.buy_now_price,
          current_bid: auction.buy_now_price,
          current_bidder_id: user.id
        })
        .eq("id", auction.id);

      // Create escrow
      const platformFeePercent = 5;
      const platformFee = (auction.buy_now_price * platformFeePercent) / 100;
      const totalAmount = auction.buy_now_price + (auction.shipping_fee || 0);

      await supabase
        .from("auction_escrow")
        .insert({
          auction_id: auction.id,
          buyer_id: user.id,
          seller_id: auction.seller.id,
          amount: auction.buy_now_price,
          platform_fee: platformFee,
          shipping_fee: auction.shipping_fee || 0,
          total_amount: totalAmount,
          status: "pending_payment"
        });

      toast.success("Congratulations! You bought this item. Please complete payment.");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to buy now");
    } finally {
      setSubmitting(false);
    }
  };

  const generateHash = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  if (!auction) return null;

  const currentPrice = auction.current_bid > 0 ? auction.current_bid : auction.starting_bid;
  const minBid = currentPrice + minBidIncrement;
  const hasReserve = auction.reserve_price && auction.current_bid < auction.reserve_price;
  const isOwner = user?.id === auction.seller.id;
  const isWinner = user?.id === auction.current_bidder_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col md:flex-row h-full">
          {/* Image Gallery */}
          <div className="w-full md:w-1/2 bg-muted relative">
            <div className="aspect-square relative">
              <img
                src={auction.images?.[currentImageIndex] || "/placeholder.svg"}
                alt={auction.title}
                className="w-full h-full object-contain"
              />

              {auction.images && auction.images.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                    onClick={() => setCurrentImageIndex((i) => (i - 1 + auction.images.length) % auction.images.length)}
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70"
                    onClick={() => setCurrentImageIndex((i) => (i + 1) % auction.images.length)}
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </Button>
                </>
              )}

              {/* Timer Overlay */}
              <div className={`absolute top-4 left-4 px-3 py-2 rounded-lg font-bold flex items-center gap-2 ${
                isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-black/80 text-white"
              }`}>
                <Clock className="h-4 w-4" />
                {timeLeft}
              </div>

              {/* Thumbnails */}
              {auction.images && auction.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {auction.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImageIndex(i)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        i === currentImageIndex ? "border-amber-500 scale-110" : "border-transparent opacity-70"
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="w-full md:w-1/2 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Title & Category */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {auction.category && (
                      <Badge variant="secondary">{auction.category.name}</Badge>
                    )}
                    <Badge variant="outline">{auction.condition.replace("_", " ")}</Badge>
                  </div>
                  <h2 className="text-2xl font-bold">{auction.title}</h2>
                </div>

                {/* Seller Info */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Avatar>
                    <AvatarImage src={auction.seller.avatar_url} />
                    <AvatarFallback>{auction.seller.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{auction.seller.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Verified Seller
                    </p>
                  </div>
                </div>

                {/* Current Bid */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 rounded-xl border border-amber-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Current Bid</span>
                    <span className="text-sm text-muted-foreground">{auction.bid_count} bids</span>
                  </div>
                  <p className="text-3xl font-bold text-amber-500">
                    ₱{currentPrice.toLocaleString()}
                  </p>
                  {hasReserve && (
                    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      Reserve price not met
                    </p>
                  )}
                  {isWinner && (
                    <p className="text-sm text-green-500 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      You're the highest bidder!
                    </p>
                  )}
                </div>

                {/* Buy Now */}
                {auction.buy_now_price && (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div>
                      <p className="text-sm text-muted-foreground">Buy Now Price</p>
                      <p className="text-xl font-bold text-green-500">
                        ₱{auction.buy_now_price.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={handleBuyNow}
                      disabled={isOwner || submitting}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Buy Now
                    </Button>
                  </div>
                )}

                {/* Bid Input */}
                {!isOwner && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="number"
                          placeholder={`Min ₱${minBid.toLocaleString()}`}
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          className="text-lg"
                        />
                      </div>
                      <Button
                        onClick={handlePlaceBid}
                        disabled={submitting || !bidAmount}
                        className="bg-amber-500 hover:bg-amber-600"
                      >
                        <Gavel className="h-4 w-4 mr-2" />
                        Place Bid
                      </Button>
                    </div>

                    {/* Auto-bid */}
                    <div className="p-4 bg-muted rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Enable Auto-bid
                        </Label>
                        <Switch
                          checked={autoBidEnabled}
                          onCheckedChange={setAutoBidEnabled}
                        />
                      </div>
                      {autoBidEnabled && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Maximum Auto-bid Amount</Label>
                          <Input
                            type="number"
                            placeholder="₱ Max amount"
                            value={maxAutoBid}
                            onChange={(e) => setMaxAutoBid(e.target.value)}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            System will auto-bid up to this amount
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Tabs */}
                <Tabs defaultValue="details">
                  <TabsList className="w-full">
                    <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                    <TabsTrigger value="bids" className="flex-1">
                      <History className="h-4 w-4 mr-1" />
                      Bids
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="flex-1">Shipping</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="mt-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {auction.description || "No description provided."}
                    </p>
                  </TabsContent>

                  <TabsContent value="bids" className="mt-4">
                    {bidHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No bids yet. Be the first!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {bidHistory.map((bid) => (
                          <div
                            key={bid.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={bid.bidder?.avatar_url} />
                                <AvatarFallback>{bid.bidder?.full_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{bid.bidder?.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(bid.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-amber-500">
                                ₱{bid.amount.toLocaleString()}
                              </p>
                              {bid.is_auto_bid && (
                                <Badge variant="outline" className="text-xs">Auto</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="shipping" className="mt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping Fee</span>
                        <span className="font-medium">
                          {auction.shipping_fee ? `₱${auction.shipping_fee.toLocaleString()}` : "Free"}
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="p-4 border-t flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleWatchlist}
              >
                <Heart className={`h-4 w-4 ${isWatched ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message Seller
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuctionDetailDialog;
