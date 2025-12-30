import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard, Package, Truck, CheckCircle, AlertTriangle,
  Upload, Loader2, Shield, Clock, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Escrow {
  id: string;
  auction_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  platform_fee: number;
  shipping_fee: number;
  total_amount: number;
  payment_method: string | null;
  payment_reference: string | null;
  payment_proof_url: string | null;
  status: string;
  paid_at: string | null;
  shipped_at: string | null;
  tracking_number: string | null;
  courier: string | null;
  delivered_at: string | null;
  released_at: string | null;
  dispute_reason: string | null;
}

interface AuctionEscrowDialogProps {
  escrow: Escrow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isSeller: boolean;
}

const STATUS_STEPS = [
  { key: "pending_payment", label: "Payment", icon: CreditCard },
  { key: "paid", label: "Paid", icon: CheckCircle },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Package },
  { key: "released", label: "Complete", icon: DollarSign },
];

const COURIERS = [
  "J&T Express",
  "LBC",
  "Grab Express",
  "Lalamove",
  "Ninja Van",
  "GoGo Xpress",
  "Flash Express",
  "Other",
];

const AuctionEscrowDialog = ({
  escrow,
  open,
  onOpenChange,
  onUpdate,
  isSeller,
}: AuctionEscrowDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [courier, setCourier] = useState("");
  const [disputeReason, setDisputeReason] = useState("");

  if (!escrow) return null;

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === escrow.status);

  const handlePayment = async () => {
    if (!paymentMethod || !paymentReference) {
      toast.error("Please fill in payment details");
      return;
    }

    setLoading(true);

    try {
      let proofUrl = null;

      if (proofFile) {
        const fileExt = proofFile.name.split(".").pop();
        const fileName = `${escrow.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("payment-proofs")
          .upload(fileName, proofFile);

        if (!uploadError) {
          const { data } = supabase.storage
            .from("payment-proofs")
            .getPublicUrl(fileName);
          proofUrl = data.publicUrl;
        }
      }

      const { error } = await supabase
        .from("auction_escrow")
        .update({
          status: "paid",
          payment_method: paymentMethod,
          payment_reference: paymentReference,
          payment_proof_url: proofUrl,
          paid_at: new Date().toISOString(),
        })
        .eq("id", escrow.id);

      if (error) throw error;

      toast.success("Payment submitted! Waiting for seller to ship.");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async () => {
    if (!trackingNumber || !courier) {
      toast.error("Please fill in shipping details");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("auction_escrow")
        .update({
          status: "shipped",
          tracking_number: trackingNumber,
          courier,
          shipped_at: new Date().toISOString(),
        })
        .eq("id", escrow.id);

      if (error) throw error;

      toast.success("Marked as shipped!");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to update shipping");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("auction_escrow")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", escrow.id);

      if (error) throw error;

      toast.success("Delivery confirmed! Funds will be released to seller.");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm delivery");
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason) {
      toast.error("Please provide a reason for the dispute");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("auction_escrow")
        .update({
          status: "disputed",
          dispute_reason: disputeReason,
          dispute_at: new Date().toISOString(),
        })
        .eq("id", escrow.id);

      if (error) throw error;

      toast.success("Dispute submitted. Admin will review.");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit dispute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Escrow Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Progress */}
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isComplete = index < currentStepIndex;
              const isDisputed = escrow.status === "disputed";

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isDisputed
                        ? "bg-red-100 text-red-500"
                        : isComplete
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-amber-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs mt-1 text-muted-foreground">{step.label}</span>
                </div>
              );
            })}
          </div>

          {escrow.status === "disputed" && (
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2 text-red-500 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Dispute Raised
              </div>
              <p className="text-sm mt-1">{escrow.dispute_reason}</p>
            </div>
          )}

          <Separator />

          {/* Amount Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Winning Bid</span>
              <span>₱{escrow.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping Fee</span>
              <span>₱{escrow.shipping_fee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Platform Fee ({(escrow.platform_fee / escrow.amount * 100).toFixed(0)}%)</span>
              <span>-₱{escrow.platform_fee.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-amber-500">₱{escrow.total_amount.toLocaleString()}</span>
            </div>
          </div>

          <Separator />

          {/* Actions based on status and role */}
          {!isSeller && escrow.status === "pending_payment" && (
            <div className="space-y-4">
              <h4 className="font-medium">Submit Payment</h4>
              <div className="space-y-3">
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gcash">GCash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="credits">Platform Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <Input
                    placeholder="Transaction reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Proof of Payment (optional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={handlePayment}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Payment
                </Button>
              </div>
            </div>
          )}

          {isSeller && escrow.status === "paid" && (
            <div className="space-y-4">
              <h4 className="font-medium">Ship Order</h4>
              <div className="space-y-3">
                <div>
                  <Label>Courier</Label>
                  <Select value={courier} onValueChange={setCourier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      {COURIERS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tracking Number</Label>
                  <Input
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-amber-500 hover:bg-amber-600"
                  onClick={handleShip}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Mark as Shipped
                </Button>
              </div>
            </div>
          )}

          {!isSeller && escrow.status === "shipped" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Tracking Information</p>
                <p className="text-sm text-muted-foreground">{escrow.courier}</p>
                <p className="text-sm font-mono">{escrow.tracking_number}</p>
              </div>
              <Button
                className="w-full bg-green-500 hover:bg-green-600"
                onClick={handleConfirmDelivery}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirm Delivery
              </Button>
              <div className="space-y-2">
                <Textarea
                  placeholder="If there's an issue, describe it here..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full text-red-500 hover:text-red-600"
                  onClick={handleDispute}
                  disabled={loading || !disputeReason}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Raise Dispute
                </Button>
              </div>
            </div>
          )}

          {escrow.status === "delivered" && (
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-600">Delivery Confirmed</p>
              <p className="text-sm text-muted-foreground">
                Funds will be released to seller within 24 hours
              </p>
            </div>
          )}

          {escrow.status === "released" && (
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-600">Payment Released</p>
              <p className="text-sm text-muted-foreground">
                Transaction completed on {escrow.released_at && format(new Date(escrow.released_at), "PPP")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuctionEscrowDialog;
