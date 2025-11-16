import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function UplineTransferRequest() {
  const { user, profile } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  // Check for pending requests
  const checkPendingRequests = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("upline_transfer_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    
    setPendingRequest(data);
  };

  useState(() => {
    checkPendingRequests();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setLoading(true);
    try {
      // Validate referral code
      const { data: newUpline, error: validateError } = await supabase
        .from("profiles")
        .select("id, full_name, referral_code")
        .eq("referral_code", referralCode.trim())
        .single();

      if (validateError || !newUpline) {
        toast.error("Invalid referral code");
        return;
      }

      if (newUpline.id === user.id) {
        toast.error("You cannot transfer to yourself");
        return;
      }

      if (newUpline.id === profile.referred_by) {
        toast.error("This is already your current upline");
        return;
      }

      // Create transfer request
      const { error: insertError } = await supabase
        .from("upline_transfer_requests")
        .insert({
          user_id: user.id,
          current_upline_id: profile.referred_by,
          requested_upline_id: newUpline.id,
          reason: reason.trim()
        });

      if (insertError) throw insertError;

      toast.success("Transfer request submitted successfully");
      setReferralCode("");
      setReason("");
      checkPendingRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  if (pendingRequest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Transfer Request</CardTitle>
          <CardDescription>You have a pending upline transfer request</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your request is awaiting admin approval. Request submitted on{" "}
              {new Date(pendingRequest.created_at).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Upline Transfer</CardTitle>
        <CardDescription>
          Transfer to a new upline. Your network stays behind, and you start fresh.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Transferring will reset your level to 1, forfeit all earnings, 
            and leave your current network behind. This action cannot be undone.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="referralCode">New Upline Referral Code</Label>
            <Input
              id="referralCode"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="Enter referral code"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="reason">Reason for Transfer</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you want to transfer..."
              rows={4}
              required
            />
          </div>
          
          <Button type="submit" disabled={loading} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Submit Transfer Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}