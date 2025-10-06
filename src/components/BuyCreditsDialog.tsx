import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, CreditCard, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyCreditsDialog = ({ open, onOpenChange }: BuyCreditsDialogProps) => {
  const [amount, setAmount] = useState("100");
  const [paymentMethod, setPaymentMethod] = useState("gcash");
  const [loading, setLoading] = useState(false);

  const credits = Math.floor(Number(amount) / 10);

  const handlePurchase = async () => {
    if (!amount || Number(amount) < 10) {
      toast.error("Minimum purchase amount is ₱10");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          amount: Number(amount),
          paymentMethod,
        },
      });

      if (error) throw error;

      if (data.checkout_url) {
        window.open(data.checkout_url, "_blank");
        toast.success("Payment window opened. Complete payment to receive credits.");
      } else {
        toast.success("Payment initiated. Please complete the payment.");
      }

      onOpenChange(false);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to initiate payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy Credits</DialogTitle>
          <DialogDescription>
            Purchase gaming credits to continue playing. 1 credit = ₱10
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                <RadioGroupItem value="paymaya" id="paymaya" />
                <Label htmlFor="paymaya" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wallet className="w-5 h-5 text-primary" />
                  <span>Maya (PayMaya)</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span>Credit/Debit Card</span>
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

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={loading} className="flex-1">
              {loading ? "Processing..." : "Continue to Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};