import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Megaphone, Upload, Calendar, DollarSign, Info, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


interface SponsoredListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingType: 'marketplace' | 'restaurant' | 'auction' | 'food_item';
  listingId: string;
  listingTitle: string;
  listingImageUrl?: string;
  onSuccess?: () => void;
}

export const SponsoredListingDialog = ({
  open,
  onOpenChange,
  listingType,
  listingId,
  listingTitle,
  listingImageUrl,
  onSuccess
}: SponsoredListingDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, listingType]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("sponsored_listing_settings")
        .select("*")
        .eq("listing_type", listingType)
        .maybeSingle();
      
      if (error) throw error;
      setSettings(data);
      if (data) {
        setBudgetAmount(data.min_budget?.toString() || "100");
        setDurationDays(data.min_duration_days?.toString() || "7");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("payment-proofs")
        .getPublicUrl(fileName);

      setPaymentProofUrl(publicUrl);
      toast.success("Payment proof uploaded");
    } catch (error: any) {
      toast.error("Failed to upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    const budget = parseFloat(budgetAmount);
    const duration = parseInt(durationDays);

    if (!budget || budget < (settings?.min_budget || 100)) {
      toast.error(`Minimum budget is ₱${settings?.min_budget || 100}`);
      return;
    }

    if (!duration || duration < (settings?.min_duration_days || 1)) {
      toast.error(`Minimum duration is ${settings?.min_duration_days || 1} days`);
      return;
    }

    if (!paymentProofUrl) {
      toast.error("Please upload payment proof");
      return;
    }

    setLoading(true);
    try {
      // Get referrer from cookie or localStorage
      const referrerId = localStorage.getItem('ref') || null;
      
      // Calculate estimated impressions
      const costPerImpression = settings?.cost_per_impression || 0.10;
      const estimatedImpressions = Math.floor(budget / costPerImpression);

      const { error } = await supabase.from("sponsored_listings").insert({
        user_id: user.id,
        listing_type: listingType,
        listing_id: listingId,
        listing_title: listingTitle,
        listing_image_url: listingImageUrl,
        budget_amount: budget,
        duration_days: duration,
        daily_budget: budget / duration,
        total_impressions_target: estimatedImpressions,
        daily_impression_cap: Math.ceil(estimatedImpressions / duration),
        payment_proof_url: paymentProofUrl,
        payment_reference: paymentReference,
        referrer_id: referrerId,
        status: "pending",
        boost_multiplier: settings?.boost_multiplier || 2.0
      });

      if (error) throw error;

      toast.success("Sponsorship request submitted! Waiting for admin approval.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const dailyBudget = budgetAmount && durationDays 
    ? (parseFloat(budgetAmount) / parseInt(durationDays)).toFixed(2)
    : "0";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Promote Your Listing
          </DialogTitle>
          <DialogDescription>
            Get more visibility by sponsoring "{listingTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {settings?.instructions && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {settings.instructions}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">
                <DollarSign className="h-3 w-3 inline mr-1" />
                Total Budget (₱)
              </Label>
              <Input
                id="budget"
                type="number"
                min={settings?.min_budget || 100}
                max={settings?.max_budget || 100000}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Enter budget"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Min: ₱{settings?.min_budget || 100}
              </p>
            </div>
            <div>
              <Label htmlFor="duration">
                <Calendar className="h-3 w-3 inline mr-1" />
                Duration (Days)
              </Label>
              <Input
                id="duration"
                type="number"
                min={settings?.min_duration_days || 1}
                max={settings?.max_duration_days || 90}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="Days"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: {settings?.max_duration_days || 90} days
              </p>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg text-sm">
            <div className="flex justify-between">
              <span>Daily Budget:</span>
              <span className="font-medium">₱{dailyBudget}/day</span>
            </div>
            <div className="flex justify-between mt-1">
              <span>Boost Multiplier:</span>
              <span className="font-medium text-primary">{settings?.boost_multiplier || 2}x visibility</span>
            </div>
          </div>

          <div>
            <Label>Payment Proof</Label>
            <div className="mt-2">
              <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    <span className="text-sm">
                      {paymentProofUrl ? "Change proof" : "Upload payment proof"}
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
              {paymentProofUrl && (
                <img src={paymentProofUrl} alt="Proof" className="mt-2 h-20 rounded object-cover" />
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="reference">Payment Reference (Optional)</Label>
            <Input
              id="reference"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Transaction ID or reference number"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || uploading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
