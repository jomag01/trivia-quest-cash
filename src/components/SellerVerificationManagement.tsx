import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function SellerVerificationManagement() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_verification_requests")
        .select(`
          *,
          profiles!seller_verification_requests_user_id_fkey (
            id,
            full_name,
            email,
            referral_code
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getReferralCount = async (userId: string) => {
    const { count } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", userId);

    return count || 0;
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Update verification request
      const { error: requestError } = await supabase
        .from("seller_verification_requests")
        .update({
          status: "approved",
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq("id", selectedRequest.id);

      if (requestError) throw requestError;

      // Update profile to mark as verified seller
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_verified_seller: true })
        .eq("id", selectedRequest.user_id);

      if (profileError) throw profileError;

      toast.success("Seller verified successfully!");
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("seller_verification_requests")
        .update({
          status: "rejected",
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast.success("Request rejected");
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Seller Verification Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {request.profiles?.full_name || request.profiles?.email}
                        </span>
                        <Badge
                          variant={
                            request.status === "approved"
                              ? "default"
                              : request.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Email: {request.profiles?.email}</p>
                        <p>Referral Code: {request.profiles?.referral_code}</p>
                        <p>
                          Requested:{" "}
                          {new Date(request.requested_at).toLocaleDateString()}
                        </p>
                        {request.admin_notes && (
                          <p className="mt-2">
                            <span className="font-medium">Admin Notes:</span> {request.admin_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {requests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No verification requests yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Seller Verification</DialogTitle>
            <DialogDescription>
              Approve or reject this seller verification request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm">
                {selectedRequest?.profiles?.full_name || selectedRequest?.profiles?.email}
              </p>
            </div>

            <div>
              <Label htmlFor="admin_notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes about this decision..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedRequest(null)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
