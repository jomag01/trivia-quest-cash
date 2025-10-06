import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Building2, Upload, ArrowUp, ArrowDown } from "lucide-react";
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handlePurchase = async () => {
    if (!amount || Number(amount) < 10) {
      toast.error("Minimum purchase amount is ₱10");
      return;
    }

    if (!receiptFile) {
      toast.error("Please upload a payment receipt");
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload receipt to storage
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, receiptFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(`${user.id}/${fileName}`);

      // Create credit purchase record
      const { error: purchaseError } = await supabase
        .from("credit_purchases")
        .insert({
          user_id: user.id,
          amount: Number(amount),
          credits: Math.floor(Number(amount) / 10),
          payment_method: paymentMethod,
          proof_image_url: publicUrl,
          status: "pending",
        });

      if (purchaseError) throw purchaseError;

      toast.success("Payment receipt submitted! Waiting for admin approval.");
      onOpenChange(false);
      setReceiptFile(null);
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

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt">Upload Payment Receipt *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                  {receiptFile && (
                    <Upload className="w-5 h-5 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot of your payment confirmation
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
          <Button onClick={handlePurchase} disabled={loading || !receiptFile} className="flex-1">
            {loading ? "Submitting..." : "Submit for Approval"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};