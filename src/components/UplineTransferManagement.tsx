import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface TransferRequest {
  id: string;
  user_id: string;
  current_upline_id: string | null;
  requested_upline_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  user: { full_name: string; email: string };
  current_upline: { full_name: string } | null;
  requested_upline: { full_name: string };
}

export function UplineTransferManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TransferRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: requestsData, error } = await supabase
        .from("upline_transfer_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch related profile data
      const enrichedRequests = await Promise.all(
        (requestsData || []).map(async (request) => {
          const [userProfile, currentUpline, requestedUpline] = await Promise.all([
            supabase.from("profiles").select("full_name, email").eq("id", request.user_id).single(),
            request.current_upline_id 
              ? supabase.from("profiles").select("full_name").eq("id", request.current_upline_id).single()
              : Promise.resolve({ data: null }),
            supabase.from("profiles").select("full_name").eq("id", request.requested_upline_id).single()
          ]);

          return {
            ...request,
            user: userProfile.data || { full_name: "Unknown", email: "" },
            current_upline: currentUpline.data,
            requested_upline: requestedUpline.data || { full_name: "Unknown" }
          };
        })
      );

      setRequests(enrichedRequests);
    } catch (error: any) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleProcess = async (approve: boolean) => {
    if (!user || !selectedRequest) return;

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("process_upline_transfer", {
        p_request_id: selectedRequest.id,
        p_admin_id: user.id,
        p_approve: approve,
        p_admin_notes: adminNotes.trim() || null
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to process request");
      }

      toast.success(approve ? "Transfer approved" : "Transfer rejected");
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle }
    };
    const { variant, icon: Icon } = variants[status] || variants.pending;
    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading transfer requests...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Upline Transfer Requests</h2>
      
      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No transfer requests found
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{request.user.full_name}</CardTitle>
                {getStatusBadge(request.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{request.user.email}</p>
              <div className="grid gap-2 text-sm">
                <div>
                  <strong>Current Upline:</strong> {request.current_upline?.full_name || "None"}
                </div>
                <div>
                  <strong>Requested Upline:</strong> {request.requested_upline.full_name}
                </div>
                <div>
                  <strong>Reason:</strong> {request.reason}
                </div>
                <div>
                  <strong>Submitted:</strong> {new Date(request.created_at).toLocaleString()}
                </div>
                {request.admin_notes && (
                  <div>
                    <strong>Admin Notes:</strong> {request.admin_notes}
                  </div>
                )}
              </div>
              
              {request.status === "pending" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedRequest(request)} className="w-full mt-4">
                      Review Request
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Process Transfer Request</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notes">Admin Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes about this decision..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleProcess(true)}
                          disabled={processing}
                          className="flex-1"
                          variant="default"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleProcess(false)}
                          disabled={processing}
                          className="flex-1"
                          variant="destructive"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}