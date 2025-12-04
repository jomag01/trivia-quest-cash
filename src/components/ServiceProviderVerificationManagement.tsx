import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Eye, Shield, IdCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VerificationRequest {
  id: string;
  user_id: string;
  id_type: string;
  id_front_url: string;
  id_back_url: string | null;
  selfie_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

const ServiceProviderVerificationManagement = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await (supabase
      .from("service_provider_verifications" as any)
      .select(`
        *,
        profiles!service_provider_verifications_user_id_fkey (full_name, avatar_url, email)
      `)
      .order("created_at", { ascending: false }) as any);

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load verification requests");
    } else {
      setRequests((data as any) || []);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    // Update verification request
    const { error: verifyError } = await (supabase
      .from("service_provider_verifications" as any)
      .update({
        status: "approved",
        admin_notes: adminNotes,
        processed_at: new Date().toISOString()
      })
      .eq("id", selectedRequest.id) as any);

    if (verifyError) {
      toast.error("Failed to approve verification");
      setProcessing(false);
      return;
    }

    // Update user profile
    const { error: profileError } = await (supabase
      .from("profiles")
      .update({
        is_verified_service_provider: true,
        service_provider_verified_at: new Date().toISOString()
      } as any)
      .eq("id", selectedRequest.user_id) as any);

    if (profileError) {
      toast.error("Failed to update user profile");
    } else {
      toast.success("Service provider verified successfully!");
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);

    const { error } = await (supabase
      .from("service_provider_verifications" as any)
      .update({
        status: "rejected",
        admin_notes: adminNotes,
        processed_at: new Date().toISOString()
      })
      .eq("id", selectedRequest.id) as any);

    if (error) {
      toast.error("Failed to reject verification");
    } else {
      toast.success("Verification request rejected");
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle }
    };
    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getIdTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      national_id: "National ID",
      passport: "Passport",
      drivers_license: "Driver's License",
      sss_id: "SSS ID",
      philhealth_id: "PhilHealth ID",
      postal_id: "Postal ID",
      voters_id: "Voter's ID"
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-center py-8">Loading verification requests...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Service Provider Verification</h2>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={request.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {request.profiles?.full_name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {request.profiles?.full_name || "Unknown User"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {request.profiles?.email}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <IdCard className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {getIdTypeLabel(request.id_type)}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(request.status)}
                  {request.status === "pending" && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedRequest(request);
                        setAdminNotes(request.admin_notes || "");
                      }}
                    >
                      Review
                    </Button>
                  )}
                </div>
              </div>
              {request.admin_notes && request.status !== "pending" && (
                <div className="mt-3 p-2 bg-muted rounded text-sm">
                  <strong>Admin Notes:</strong> {request.admin_notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {requests.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No verification requests yet</p>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Review Verification Request
            </DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedRequest.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedRequest.profiles?.full_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedRequest.profiles?.full_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.profiles?.email}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">ID Type</h4>
                <Badge variant="outline">{getIdTypeLabel(selectedRequest.id_type)}</Badge>
              </div>

              <div>
                <h4 className="font-medium mb-2">Submitted Documents</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div 
                    className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                    onClick={() => setViewingImage(selectedRequest.id_front_url)}
                  >
                    <img 
                      src={selectedRequest.id_front_url} 
                      alt="ID Front"
                      className="w-full h-full object-cover"
                    />
                    <p className="text-xs text-center mt-1">ID Front</p>
                  </div>
                  {selectedRequest.id_back_url && (
                    <div 
                      className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                      onClick={() => setViewingImage(selectedRequest.id_back_url!)}
                    >
                      <img 
                        src={selectedRequest.id_back_url} 
                        alt="ID Back"
                        className="w-full h-full object-cover"
                      />
                      <p className="text-xs text-center mt-1">ID Back</p>
                    </div>
                  )}
                  {selectedRequest.selfie_url && (
                    <div 
                      className="aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                      onClick={() => setViewingImage(selectedRequest.selfie_url!)}
                    >
                      <img 
                        src={selectedRequest.selfie_url} 
                        alt="Selfie"
                        className="w-full h-full object-cover"
                      />
                      <p className="text-xs text-center mt-1">Selfie with ID</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Admin Notes</h4>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this verification..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
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
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  onClick={handleApprove}
                  disabled={processing}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img 
              src={viewingImage} 
              alt="Document" 
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServiceProviderVerificationManagement;