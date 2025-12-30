import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gavel, CheckCircle, XCircle, Clock, Eye,
  Search, Settings, DollarSign, AlertTriangle,
  Shield, TrendingUp, Users
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Auction {
  id: string;
  title: string;
  images: string[];
  starting_bid: number;
  current_bid: number;
  bid_count: number;
  ends_at: string;
  status: string;
  created_at: string;
  admin_notes: string | null;
  seller: {
    id: string;
    full_name: string;
    email: string;
  };
  category: {
    name: string;
  } | null;
}

interface Escrow {
  id: string;
  auction_id: string;
  amount: number;
  total_amount: number;
  status: string;
  created_at: string;
  buyer: {
    full_name: string;
  };
  seller: {
    full_name: string;
  };
  auction: {
    title: string;
  };
}

interface Settings {
  [key: string]: string;
}

const AuctionManagement = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    totalBids: 0,
    totalVolume: 0,
    disputes: 0,
  });

  useEffect(() => {
    fetchData();
    fetchStats();
    fetchSettings();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);

    if (activeTab === "escrow" || activeTab === "disputes") {
      let query = supabase
        .from("auction_escrow")
        .select(`
          *,
          buyer:profiles!auction_escrow_buyer_id_fkey(full_name),
          seller:profiles!auction_escrow_seller_id_fkey(full_name),
          auction:auctions(title)
        `)
        .order("created_at", { ascending: false });

      if (activeTab === "disputes") {
        query = query.eq("status", "disputed");
      }

      const { data } = await query;
      if (data) setEscrows(data as any);
    } else {
      let query = supabase
        .from("auctions")
        .select(`
          *,
          seller:profiles!auctions_seller_id_fkey(id, full_name, email),
          category:auction_categories(name)
        `)
        .order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("status", "pending_approval");
      } else if (activeTab === "active") {
        query = query.eq("status", "active");
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data } = await query;
      if (data) setAuctions(data as any);
    }

    setLoading(false);
  };

  const fetchStats = async () => {
    const [pendingRes, activeRes, bidsRes, volumeRes, disputesRes] = await Promise.all([
      supabase.from("auctions").select("id", { count: "exact" }).eq("status", "pending_approval"),
      supabase.from("auctions").select("id", { count: "exact" }).eq("status", "active"),
      supabase.from("auction_bids").select("id", { count: "exact" }),
      supabase.from("auctions").select("winning_bid").eq("status", "sold"),
      supabase.from("auction_escrow").select("id", { count: "exact" }).eq("status", "disputed"),
    ]);

    const totalVolume = (volumeRes.data || []).reduce((sum, a) => sum + (a.winning_bid || 0), 0);

    setStats({
      pending: pendingRes.count || 0,
      active: activeRes.count || 0,
      totalBids: bidsRes.count || 0,
      totalVolume,
      disputes: disputesRes.count || 0,
    });
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("auction_settings")
      .select("setting_key, setting_value");
    if (data) {
      const settingsMap: Settings = {};
      data.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value || "";
      });
      setSettings(settingsMap);
    }
  };

  const handleApprove = async (auctionId: string) => {
    const { error } = await supabase
      .from("auctions")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq("id", auctionId);

    if (error) {
      toast.error("Failed to approve auction");
    } else {
      toast.success("Auction approved and now live!");
      setSelectedAuction(null);
      setAdminNotes("");
      fetchData();
      fetchStats();
    }
  };

  const handleReject = async (auctionId: string) => {
    if (!adminNotes) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    const { error } = await supabase
      .from("auctions")
      .update({
        status: "cancelled",
        admin_notes: adminNotes,
      })
      .eq("id", auctionId);

    if (error) {
      toast.error("Failed to reject auction");
    } else {
      toast.success("Auction rejected");
      setSelectedAuction(null);
      setAdminNotes("");
      fetchData();
      fetchStats();
    }
  };

  const handleResolveDispute = async (escrowId: string, resolution: "refund" | "release") => {
    const { error } = await supabase
      .from("auction_escrow")
      .update({
        status: resolution === "refund" ? "refunded" : "released",
        released_at: new Date().toISOString(),
      })
      .eq("id", escrowId);

    if (error) {
      toast.error("Failed to resolve dispute");
    } else {
      toast.success(`Dispute resolved - ${resolution === "refund" ? "Buyer refunded" : "Funds released to seller"}`);
      fetchData();
      fetchStats();
    }
  };

  const handleSaveSettings = async (key: string, value: string) => {
    const { error } = await supabase
      .from("auction_settings")
      .update({ setting_value: value })
      .eq("setting_key", key);

    if (error) {
      toast.error("Failed to save setting");
    } else {
      toast.success("Setting saved");
      setSettings({ ...settings, [key]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Gavel className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalBids}</p>
              <p className="text-xs text-muted-foreground">Total Bids</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">₱{(stats.totalVolume / 1000).toFixed(0)}K</p>
              <p className="text-xs text-muted-foreground">Volume</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.disputes}</p>
              <p className="text-xs text-muted-foreground">Disputes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="escrow">Escrow</TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Disputes ({stats.disputes})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          {(activeTab === "pending" || activeTab === "active") && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search auctions..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
              />
            </div>
          )}
        </div>

        {/* Pending/Active Auctions */}
        <TabsContent value={activeTab} className="mt-4">
          {activeTab === "settings" ? (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Auction Settings</h3>
              <div className="grid gap-4">
                {Object.entries(settings).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4">
                    <label className="w-48 text-sm capitalize">
                      {key.replace(/_/g, " ")}
                    </label>
                    <Input
                      value={value}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveSettings(key, settings[key])}
                    >
                      Save
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          ) : activeTab === "escrow" || activeTab === "disputes" ? (
            <div className="space-y-4">
              {escrows.length === 0 ? (
                <Card className="p-12 text-center">
                  <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No {activeTab} found</p>
                </Card>
              ) : (
                escrows.map((escrow) => (
                  <Card key={escrow.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{escrow.auction?.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Buyer: {escrow.buyer?.full_name} → Seller: {escrow.seller?.full_name}
                        </p>
                        <p className="text-lg font-bold text-amber-500 mt-1">
                          ₱{escrow.total_amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge>{escrow.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(escrow.created_at), "MMM d, yyyy")}
                        </p>
                        {escrow.status === "disputed" && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolveDispute(escrow.id, "refund")}
                            >
                              Refund Buyer
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleResolveDispute(escrow.id, "release")}
                            >
                              Release to Seller
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
            </div>
          ) : auctions.length === 0 ? (
            <Card className="p-12 text-center">
              <Gavel className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No auctions found</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {auctions.map((auction) => (
                <Card key={auction.id} className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img
                        src={auction.images?.[0] || "/placeholder.svg"}
                        alt={auction.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{auction.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Seller: {auction.seller?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {auction.category?.name}
                          </p>
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

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAuction(auction)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        {auction.status === "pending_approval" && (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => handleApprove(auction.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedAuction(auction);
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedAuction} onOpenChange={(open) => !open && setSelectedAuction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Auction</DialogTitle>
          </DialogHeader>

          {selectedAuction && (
            <div className="space-y-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedAuction.images?.[0] || "/placeholder.svg"}
                  alt={selectedAuction.title}
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedAuction.title}</h3>
                <p className="text-sm text-muted-foreground">
                  by {selectedAuction.seller?.full_name} ({selectedAuction.seller?.email})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Starting Bid:</span>
                  <span className="ml-2 font-medium">₱{selectedAuction.starting_bid.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2 font-medium">{selectedAuction.category?.name}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  placeholder="Add notes (required for rejection)..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={() => handleApprove(selectedAuction.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleReject(selectedAuction.id)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuctionManagement;
