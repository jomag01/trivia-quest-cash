import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Clock, CheckCircle, XCircle, AlertCircle,
  Eye, Gavel, DollarSign, Package, MessageSquare
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import AuctionEscrowDialog from "./AuctionEscrowDialog";

interface MyAuctionsProps {
  onCreateNew: () => void;
}

interface Auction {
  id: string;
  title: string;
  images: string[];
  starting_bid: number;
  current_bid: number;
  bid_count: number;
  ends_at: string;
  status: string;
  winner_id: string | null;
  winning_bid: number | null;
  views: number;
  created_at: string;
  escrow?: any;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-500", icon: AlertCircle },
  pending_approval: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  active: { label: "Active", color: "bg-green-500", icon: CheckCircle },
  ended: { label: "Ended", color: "bg-blue-500", icon: Clock },
  sold: { label: "Sold", color: "bg-purple-500", icon: DollarSign },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
  reserve_not_met: { label: "Reserve Not Met", color: "bg-orange-500", icon: AlertCircle },
};

const MyAuctions = ({ onCreateNew }: MyAuctionsProps) => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedEscrow, setSelectedEscrow] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchAuctions();
    }
  }, [user, activeTab]);

  const fetchAuctions = async () => {
    if (!user) return;

    let query = supabase
      .from("auctions")
      .select(`
        *,
        escrow:auction_escrow(*)
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (activeTab !== "all") {
      query = query.eq("status", activeTab);
    }

    const { data, error } = await query;
    if (data) {
      setAuctions(data.map(a => ({ ...a, escrow: a.escrow?.[0] })));
    }
    setLoading(false);
  };

  const handleCancelAuction = async (auctionId: string) => {
    const auction = auctions.find(a => a.id === auctionId);
    if (!auction) return;

    if (auction.bid_count > 0) {
      toast.error("Cannot cancel auction with existing bids");
      return;
    }

    const { error } = await supabase
      .from("auctions")
      .update({ status: "cancelled" })
      .eq("id", auctionId);

    if (error) {
      toast.error("Failed to cancel auction");
    } else {
      toast.success("Auction cancelled");
      fetchAuctions();
    }
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My Auctions</h2>
        <Button onClick={onCreateNew} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="h-4 w-4 mr-2" />
          Create Auction
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending_approval">Pending</TabsTrigger>
          <TabsTrigger value="sold">Sold</TabsTrigger>
          <TabsTrigger value="ended">Ended</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {auctions.length === 0 ? (
            <Card className="p-12 text-center">
              <Gavel className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No auctions found</h3>
              <p className="text-muted-foreground mb-4">
                Start selling by creating your first auction
              </p>
              <Button onClick={onCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create Auction
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {auctions.map((auction) => {
                const statusConfig = getStatusConfig(auction.status);
                const StatusIcon = statusConfig.icon;

                return (
                  <Card key={auction.id} className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={auction.images?.[0] || "/placeholder.svg"}
                          alt={auction.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold line-clamp-1">{auction.title}</h3>
                            <Badge className={`${statusConfig.color} text-white text-xs mt-1`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-500">
                              ₱{(auction.current_bid || auction.starting_bid).toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {auction.bid_count} bids
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {auction.views} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {auction.status === "active"
                              ? `Ends ${formatDistanceToNow(new Date(auction.ends_at), { addSuffix: true })}`
                              : format(new Date(auction.ends_at), "MMM d, yyyy")
                            }
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          {auction.status === "active" && auction.bid_count === 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelAuction(auction.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          {auction.status === "sold" && auction.escrow && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEscrow(auction.escrow)}
                            >
                              <Package className="h-4 w-4 mr-1" />
                              Manage Order
                            </Button>
                          )}
                          {auction.winner_id && (
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Message Buyer
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Escrow Management Dialog */}
      <AuctionEscrowDialog
        escrow={selectedEscrow}
        open={!!selectedEscrow}
        onOpenChange={(open) => !open && setSelectedEscrow(null)}
        onUpdate={fetchAuctions}
        isSeller
      />
    </div>
  );
};

export default MyAuctions;
