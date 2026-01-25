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
  }, [activeTab]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sponsored_listings")
        .select("*, profiles:user_id(full_name, email)")
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
      endDate.setDate(endDate.getDate() + listing.duration_days);

      const { error } = await supabase
        .from("sponsored_listings")
        .update({
          status: "active",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          admin_notes: adminNotes
        })
        .eq("id", listing.id);

      if (error) throw error;

      // Update the listing's is_sponsored flag
      const tableMap: Record<string, string> = {
        marketplace: "marketplace_listings",
        restaurant: "food_vendors",
        auction: "auctions",
        food_item: "food_items"
      };

      const tableName = tableMap[listing.listing_type];
      if (tableName) {
        // Use type assertion to bypass strict typing for dynamic table names
        const table = supabase.from(tableName as 'marketplace_listings');
        await table
          .update({ 
            is_sponsored: true, 
            sponsored_until: endDate.toISOString() 
          } as any)
          .eq("id", listing.listing_id);
      }

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
        .from("sponsored_listings")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          approved_by: user?.id
        })
        .eq("id", listing.id);

      if (error) throw error;

      toast.success("Sponsorship request rejected");
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
                      {listing.listing_image_url && (
                        <img
                          src={listing.listing_image_url}
                          alt={listing.listing_title}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{listing.listing_title}</h4>
                            <p className="text-sm text-muted-foreground">
                              by {listing.profiles?.full_name || listing.profiles?.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{getTypeLabel(listing.listing_type)}</Badge>
                              {getStatusBadge(listing.status)}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">₱{listing.budget_amount?.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{listing.duration_days} days</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ₱{listing.daily_budget?.toFixed(2)}/day
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(listing.created_at), "MMM d, yyyy")}
                          </span>
                          {listing.impressions > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {listing.impressions} views
                            </span>
                          )}
                        </div>

                        {listing.status === "pending" && (
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
                        )}
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
                  {selectedListing.listing_image_url && (
                    <img
                      src={selectedListing.listing_image_url}
                      alt={selectedListing.listing_title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div>
                    <h4 className="font-semibold">{selectedListing.listing_title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getTypeLabel(selectedListing.listing_type)}
                    </p>
                    <p className="font-bold mt-2">
                      ₱{selectedListing.budget_amount?.toLocaleString()} for {selectedListing.duration_days} days
                    </p>
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
