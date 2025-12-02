import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, Pause, Play } from "lucide-react";

interface UserAd {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  target_category: string | null;
  target_behavior: string[] | null;
  budget_diamonds: number;
  spent_diamonds: number;
  cost_per_view: number;
  views_count: number;
  clicks_count: number;
  conversions_count: number;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export const UserAdManagement = () => {
  const [ads, setAds] = useState<UserAd[]>([]);
  const [selectedAd, setSelectedAd] = useState<UserAd | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUserAds();
  }, []);

  const fetchUserAds = async () => {
    try {
      const { data, error } = await supabase
        .from("user_ads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error: any) {
      console.error("Error fetching user ads:", error);
    }
  };

  const handleReviewAd = (ad: UserAd) => {
    setSelectedAd(ad);
    setAdminNotes(ad.admin_notes || "");
    setReviewDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedAd) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("user_ads")
        .update({
          status: 'active',
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedAd.id);

      if (error) throw error;
      toast.success("Ad approved successfully!");
      setReviewDialogOpen(false);
      fetchUserAds();
    } catch (error: any) {
      toast.error("Failed to approve ad: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAd) return;
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("user_ads")
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
        })
        .eq("id", selectedAd.id);

      if (error) throw error;
      toast.success("Ad rejected");
      setReviewDialogOpen(false);
      fetchUserAds();
    } catch (error: any) {
      toast.error("Failed to reject ad: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleAdStatus = async (adId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const { error } = await supabase
        .from("user_ads")
        .update({ status: newStatus })
        .eq("id", adId);

      if (error) throw error;
      toast.success(`Ad ${newStatus === 'active' ? 'activated' : 'paused'}`);
      fetchUserAds();
    } catch (error: any) {
      toast.error("Failed to update ad status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      active: "default",
      paused: "secondary",
      completed: "secondary",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">User Ad Management</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Preview</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Performance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No user ads submitted yet
              </TableCell>
            </TableRow>
          ) : (
            ads.map((ad) => (
              <TableRow key={ad.id}>
                <TableCell>
                  {ad.image_url && (
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  {!ad.image_url && ad.video_url && (
                    <video
                      src={ad.video_url}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{ad.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-xs">
                      {ad.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{ad.user_id.slice(0, 8)}...</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {ad.spent_diamonds}/{ad.budget_diamonds} 💎
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    <div>{ad.views_count} views</div>
                    <div>{ad.clicks_count} clicks</div>
                    <div>{ad.conversions_count} conv.</div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(ad.status)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleReviewAd(ad)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {ad.status === 'active' || ad.status === 'paused' ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAdStatus(ad.id, ad.status)}
                      >
                        {ad.status === 'active' ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Ad Campaign</DialogTitle>
          </DialogHeader>
          {selectedAd && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {selectedAd.image_url && (
                  <img
                    src={selectedAd.image_url}
                    alt={selectedAd.title}
                    className="w-full h-48 object-cover rounded"
                  />
                )}
                {selectedAd.video_url && (
                  <video
                    src={selectedAd.video_url}
                    controls
                    className="w-full h-48 object-cover rounded"
                  />
                )}
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedAd.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedAd.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Target Category:</span> {selectedAd.target_category || 'None'}
                </div>
                <div>
                  <span className="font-medium">Target Behavior:</span>{' '}
                  {selectedAd.target_behavior?.join(', ') || 'None'}
                </div>
                <div>
                  <span className="font-medium">Budget:</span> {selectedAd.budget_diamonds} 💎
                </div>
                <div>
                  <span className="font-medium">Cost/View:</span> {selectedAd.cost_per_view} 💎
                </div>
                <div>
                  <span className="font-medium">Link:</span>{' '}
                  {selectedAd.link_url ? (
                    <a
                      href={selectedAd.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    'None'
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes for the advertiser..."
                  rows={3}
                />
              </div>

              {selectedAd.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={processing}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};