import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Image,
  Video,
  Music,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BinaryAIPurchase {
  id: string;
  user_id: string;
  amount: number;
  credits_received: number;
  images_allocated: number | null;
  video_minutes_allocated: number | null;
  audio_minutes_allocated: number | null;
  sponsor_id: string | null;
  status: string;
  admin_notes: string | null;
  is_first_purchase: boolean | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

const BinaryAIPurchaseManagement = () => {
  const [purchases, setPurchases] = useState<BinaryAIPurchase[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("binary_ai_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load AI package purchases");
      setLoading(false);
      return;
    }

    setPurchases(data || []);

    // Fetch user profiles for all purchases
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p) => p.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profiles) {
        const profileMap: Record<string, UserProfile> = {};
        profiles.forEach((p) => {
          profileMap[p.id] = p;
        });
        setUserProfiles(profileMap);
      }
    }

    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const purchase = purchases.find((p) => p.id === id);
    if (!purchase) return;

    try {
      // Get current user for approved_by
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      // Update purchase status
      const { error: updateError } = await supabase
        .from("binary_ai_purchases")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          approved_at: new Date().toISOString(),
          approved_by: adminUser?.id || null,
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating purchase status:", updateError);
        toast.error("Failed to approve purchase: " + updateError.message);
        return;
      }

      // Add credits to user's AI credits
      const { data: currentCredits, error: fetchError } = await supabase
        .from("user_ai_credits")
        .select("total_credits, images_available, video_minutes_available, audio_minutes_available")
        .eq("user_id", purchase.user_id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching current credits:", fetchError);
      }

      if (currentCredits) {
        const { error: creditUpdateError } = await supabase
          .from("user_ai_credits")
          .update({
            total_credits: (currentCredits.total_credits || 0) + purchase.credits_received,
            images_available: (currentCredits.images_available || 0) + (purchase.images_allocated || 0),
            video_minutes_available: (currentCredits.video_minutes_available || 0) + (purchase.video_minutes_allocated || 0),
            audio_minutes_available: (currentCredits.audio_minutes_available || 0) + (purchase.audio_minutes_allocated || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", purchase.user_id);
        
        if (creditUpdateError) {
          console.error("Error updating AI credits:", creditUpdateError);
          toast.error("Failed to add credits: " + creditUpdateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase.from("user_ai_credits").insert({
          user_id: purchase.user_id,
          total_credits: purchase.credits_received,
          images_available: purchase.images_allocated || 0,
          video_minutes_available: purchase.video_minutes_allocated || 0,
          audio_minutes_available: purchase.audio_minutes_allocated || 0,
        });
        
        if (insertError) {
          console.error("Error inserting AI credits:", insertError);
          toast.error("Failed to add credits: " + insertError.message);
          return;
        }
      }

      // Activate paid affiliate status for the user
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          is_paid_affiliate: true,
          is_verified_seller: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", purchase.user_id);

      if (profileUpdateError) {
        console.error("Error activating paid affiliate:", profileUpdateError);
      }

      // Send notification
      await supabase.from("notifications").insert({
        user_id: purchase.user_id,
        type: "ai_credits",
        title: "AI Credits Approved! 🎉",
        message: `Your purchase of ${purchase.credits_received} AI credits has been approved! You now have access to all premium features including ${purchase.images_allocated || 0} images, ${purchase.video_minutes_allocated || 0} video minutes, and ${purchase.audio_minutes_allocated || 0} audio minutes.`,
        reference_id: id,
      });

      toast.success("Purchase approved, credits added, and affiliate status activated!");
      setAdminNotes("");
      setProcessingId(null);
      fetchPurchases();
    } catch (error) {
      console.error("Error approving purchase:", error);
      toast.error("An error occurred while approving");
    }
  };

  const handleReject = async (id: string) => {
    const purchase = purchases.find((p) => p.id === id);
    
    // Send notification before deleting
    if (purchase) {
      await supabase.from("notifications").insert({
        user_id: purchase.user_id,
        type: "ai_credits",
        title: "AI Credits Purchase Rejected",
        message: `Your purchase request was rejected. ${adminNotes ? `Reason: ${adminNotes}` : "Please contact support for more information."}`,
        reference_id: id,
      });
    }

    // Delete the rejected purchase instead of just updating status
    const { error } = await supabase
      .from("binary_ai_purchases")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to reject purchase");
      return;
    }

    toast.success("Purchase rejected and removed");
    setAdminNotes("");
    setProcessingId(null);
    fetchPurchases();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
    > = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const pendingCount = purchases.filter((p) => p.status === "pending").length;

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading AI package purchases...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Package Purchases
          {pendingCount > 0 && (
            <Badge variant="destructive">{pendingCount} pending</Badge>
          )}
        </h2>
        <Button variant="outline" size="sm" onClick={fetchPurchases}>
          Refresh
        </Button>
      </div>

      {purchases.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No AI package purchases yet</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const profile = userProfiles[purchase.user_id];
            return (
              <Card key={purchase.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {profile?.full_name || profile?.email || purchase.user_id.slice(0, 8) + "..."}
                        </span>
                      </div>
                      {getStatusBadge(purchase.status)}
                      {purchase.is_first_purchase && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          First Purchase
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="font-semibold">₱{purchase.amount.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-muted rounded flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Credits</p>
                          <p className="font-semibold">{purchase.credits_received}</p>
                        </div>
                      </div>
                      {purchase.images_allocated && (
                        <div className="p-2 bg-muted rounded flex items-center gap-2">
                          <Image className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Images</p>
                            <p className="font-semibold">{purchase.images_allocated}</p>
                          </div>
                        </div>
                      )}
                      {purchase.video_minutes_allocated && (
                        <div className="p-2 bg-muted rounded flex items-center gap-2">
                          <Video className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Video</p>
                            <p className="font-semibold">{purchase.video_minutes_allocated}min</p>
                          </div>
                        </div>
                      )}
                      {purchase.audio_minutes_allocated && (
                        <div className="p-2 bg-muted rounded flex items-center gap-2">
                          <Music className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Audio</p>
                            <p className="font-semibold">{purchase.audio_minutes_allocated}min</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Submitted: {new Date(purchase.created_at).toLocaleString()}
                    </div>

                    {purchase.admin_notes && (
                      <div className="p-2 bg-muted rounded">
                        <p className="text-xs font-semibold">Admin Notes:</p>
                        <p className="text-sm">{purchase.admin_notes}</p>
                      </div>
                    )}
                  </div>

                  {purchase.status === "pending" && (
                    <Button
                      size="sm"
                      onClick={() => setProcessingId(purchase.id)}
                      className="shrink-0"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Processing Dialog */}
      <Dialog
        open={!!processingId}
        onOpenChange={() => {
          setProcessingId(null);
          setAdminNotes("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process AI Package Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Admin Notes (optional)</label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this transaction..."
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => handleApprove(processingId!)}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Add Credits
              </Button>
              <Button
                onClick={() => handleReject(processingId!)}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BinaryAIPurchaseManagement;
