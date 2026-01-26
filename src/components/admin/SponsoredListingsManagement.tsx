import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Megaphone, Check, X, Eye, Calendar, DollarSign, Clock } from "lucide-react";
import { format } from "date-fns";

export default function SponsoredListingsManagement() {
  const { user } = useAuth();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchListings();

    // Real-time subscription for impressions/clicks updates
    const channel = supabase
      .channel('sponsored_products_updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sponsored_products' },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sponsored_products")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      setListings(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listing: any) => {
    setProcessing(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (listing.daily_budget ? Math.floor(listing.total_budget / listing.daily_budget) : 7));

      const { error } = await supabase
        .from("sponsored_products")
        .update({
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
        .eq("id", listing.id);

      if (error) throw error;

      toast.success("Sponsorship approved and activated!");
      setSelectedListing(null);
      setAdminNotes("");
      fetchListings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (listing: any) => {
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("sponsored_products")
        .update({
          status: "paused"
        })
        .eq("id", listing.id);

      if (error) throw error;

      toast.success("Sponsorship request paused");
      setSelectedListing(null);
      setAdminNotes("");
      fetchListings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      approved: { variant: "default", label: "Approved" },
      active: { variant: "default", label: "Active" },
      expired: { variant: "outline", label: "Expired" },
      rejected: { variant: "destructive", label: "Rejected" },
      paused: { variant: "secondary", label: "Paused" }
    };
    const { variant, label } = config[status] || { variant: "secondary", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      marketplace: "Marketplace",
      restaurant: "Restaurant",
      auction: "Auction",
      food_item: "Food Item"
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Sponsored Listings Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {listings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No {activeTab === "all" ? "" : activeTab} sponsored listings
              </p>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <Card key={listing.id} className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{listing.campaign_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Seller: {listing.seller_id?.slice(0, 8)}...
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusBadge(listing.status)}
                              {listing.is_learning_phase && (
                                <Badge variant="outline">Learning</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₱{listing.total_budget?.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">₱{listing.daily_budget}/day</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Spent: ₱{listing.spent_amount?.toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(listing.created_at), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {listing.impressions || 0} views
                          </span>
                          <span>{listing.clicks || 0} clicks</span>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedListing(listing);
                              setAdminNotes("");
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
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

        {/* Review Dialog */}
        <Dialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Sponsorship Request</DialogTitle>
            </DialogHeader>
            
            {selectedListing && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div>
                    <h4 className="font-semibold">{selectedListing.campaign_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Goal: {selectedListing.optimization_goal}
                    </p>
                    <p className="font-bold mt-2">
                      ₱{selectedListing.total_budget?.toLocaleString()} total (₱{selectedListing.daily_budget}/day)
                    </p>
                    <div className="text-sm mt-2">
                      <p>Impressions: {selectedListing.impressions || 0}</p>
                      <p>Clicks: {selectedListing.clicks || 0}</p>
                      <p>Quality Score: {selectedListing.quality_score}</p>
                    </div>
                  </div>
                </div>

                {selectedListing.payment_proof_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">Payment Proof:</p>
                    <img
                      src={selectedListing.payment_proof_url}
                      alt="Payment proof"
                      className="max-h-48 rounded border"
                    />
                    {selectedListing.payment_reference && (
                      <p className="text-sm mt-1">Ref: {selectedListing.payment_reference}</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Admin Notes:</p>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes (required for rejection)"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => handleReject(selectedListing)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <X className="h-4 w-4 mr-1" />}
                Reject
              </Button>
              <Button
                onClick={() => handleApprove(selectedListing)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Approve & Activate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
