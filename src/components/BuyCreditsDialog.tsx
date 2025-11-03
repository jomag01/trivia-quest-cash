import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Building2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyCreditsDialog = ({ open, onOpenChange }: BuyCreditsDialogProps) => {
  const [amount, setAmount] = useState("100");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [loading, setLoading] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [senderName, setSenderName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverAccount, setReceiverAccount] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const credits = Math.floor(Number(amount) / 10);

  // Payment details - Update these with your actual account details
  const paymentDetails = {
    gcash: {
      name: "Your Name",
      number: "09XX XXX XXXX",
    },
    bank: {
      name: "Your Name",
      accountNumber: "XXXX XXXX XXXX",
      bankName: "Your Bank Name",
    },
  };


  const handlePurchase = async () => {
    if (!amount || Number(amount) < 10) {
      toast.error("Minimum purchase amount is ₱10");
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error("Please enter payment reference number");
      return;
    }

    if (!senderName.trim()) {
      toast.error("Please enter sender name");
      return;
    }

    if (!receiverName.trim()) {
      toast.error("Please enter receiver name");
      return;
    }

    if (!receiverAccount.trim()) {
      toast.error("Please enter receiver account");
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let proofImageUrl = null;

      // Upload proof image if provided
      if (proofImage) {
        setUploading(true);
        const fileExt = proofImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        try {
          const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, proofImage);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);

          proofImageUrl = publicUrl;
        } catch (err) {
          console.error("Payment proof upload failed, falling back to embedded data URL:", err);
          // Fallback: store as data URL in DB so the image still shows up
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(proofImage);
          });
          proofImageUrl = dataUrl;
          toast.warning("Storage issue detected. We embedded the image so it still works.");
        } finally {
          setUploading(false);
        }
      }

      // Create credit purchase record
      const { error: purchaseError } = await supabase
        .from("credit_purchases")
        .insert({
          user_id: user.id,
          amount: Number(amount),
          credits: Math.floor(Number(amount) / 10),
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          sender_name: senderName,
          receiver_name: receiverName,
          receiver_account: receiverAccount,
          referral_code: referralCode || null,
          proof_image_url: proofImageUrl,
          status: "pending",
        });

      if (purchaseError) throw purchaseError;

      toast.success("Payment details submitted! Waiting for admin approval.");
      onOpenChange(false);
      setAmount("100");
      setReferenceNumber("");
      setSenderName("");
      setReceiverName("");
      setReceiverAccount("");
      setReferralCode("");
      setProofImage(null);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to submit payment");
    } finally {
      setLoading(false);
    }
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Buy Credits</DialogTitle>
          <DialogDescription>
            Purchase gaming credits to continue playing. 1 credit = ₱10
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 pr-4">
            <div ref={scrollRef} className="space-y-6 pb-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PHP)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="10"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                />
                <p className="text-sm text-muted-foreground">
                  You will receive <span className="font-bold text-primary">{credits} credits</span>
                </p>
              </div>

              <div className="space-y-3">
                <Label>Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="gcash" id="gcash" />
                    <Label htmlFor="gcash" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Wallet className="w-5 h-5 text-primary" />
                      <span>GCash</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="bank" id="bank" />
                    <Label htmlFor="bank" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Building2 className="w-5 h-5 text-primary" />
                      <span>Bank Transfer</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Details */}
              <Card className="p-4 bg-accent/50">
                <h4 className="font-semibold mb-2">Payment Details</h4>
                {paymentMethod === "gcash" && (
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {paymentDetails.gcash.name}</p>
                    <p><strong>Number:</strong> {paymentDetails.gcash.number}</p>
                  </div>
                )}
                {paymentMethod === "bank" && (
                  <div className="space-y-1 text-sm">
                    <p><strong>Bank:</strong> {paymentDetails.bank.bankName}</p>
                    <p><strong>Account Name:</strong> {paymentDetails.bank.name}</p>
                    <p><strong>Account Number:</strong> {paymentDetails.bank.accountNumber}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Please send ₱{amount} to the above details
                </p>
              </Card>

              {/* Payment Reference */}
              <div className="space-y-2">
                <Label htmlFor="reference">Payment Reference Number *</Label>
                <Input
                  id="reference"
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Enter transaction/reference number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the reference number from your payment confirmation
                </p>
              </div>

              {/* Sender Name */}
              <div className="space-y-2">
                <Label htmlFor="sender">Sender Name *</Label>
                <Input
                  id="sender"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Enter sender's full name"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the name used for the payment
                </p>
              </div>

              {/* Receiver Name */}
              <div className="space-y-2">
                <Label htmlFor="receiver-name">Receiver Name *</Label>
                <Input
                  id="receiver-name"
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Enter receiver's full name"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the name of the person receiving payment
                </p>
              </div>

              {/* Receiver Account */}
              <div className="space-y-2">
                <Label htmlFor="receiver-account">Receiver Account (Bank/E-wallet) *</Label>
                <Input
                  id="receiver-account"
                  type="text"
                  value={receiverAccount}
                  onChange={(e) => setReceiverAccount(e.target.value)}
                  placeholder="Enter account number or e-wallet number"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the receiver's bank account or e-wallet number
                </p>
              </div>

              {/* Payment Proof Image */}
              <div className="space-y-2">
                <Label htmlFor="proof">Payment Proof Image (Optional)</Label>
                <Input
                  id="proof"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot of your payment confirmation
                </p>
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <Label htmlFor="referral">Referral Code (Optional)</Label>
                <Input
                  id="referral"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Enter referral code if you have one"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a referral code to support your referrer
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="absolute right-6 bottom-20 flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="rounded-full shadow-lg"
              onClick={scrollToTop}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="rounded-full shadow-lg"
              onClick={scrollToBottom}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={loading || uploading} className="flex-1">
            {uploading ? "Uploading..." : loading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};