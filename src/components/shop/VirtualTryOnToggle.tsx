import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, Coins, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAICredits } from "@/hooks/useAICredits";

interface VirtualTryOnToggleProps {
  productId: string;
  productName: string;
  isEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export const VirtualTryOnToggle = ({ 
  productId, 
  productName, 
  isEnabled = false,
  onToggle 
}: VirtualTryOnToggleProps) => {
  const { user } = useAuth();
  const { credits, subscription, deductCredits, refetch } = useAICredits();
  const [enabled, setEnabled] = useState(isEnabled);
  const [sellerCreditCost, setSellerCreditCost] = useState(20);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEnabled(isEnabled);
  }, [isEnabled]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key, value')
          .eq('key', 'virtual_tryon_seller_setup_credits')
          .single();

        if (data) {
          setSellerCreditCost(parseInt(data.value || '20'));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const getTotalCredits = () => {
    const legacyCredits = credits?.total_credits || 0;
    const subscriptionCredits = subscription?.credits_remaining || 0;
    return legacyCredits + subscriptionCredits;
  };

  const handleToggle = async (newValue: boolean) => {
    if (!user) {
      toast.error("Please login to manage this feature");
      return;
    }

    if (newValue && !enabled) {
      // Enabling - need to pay
      setShowConfirmDialog(true);
    } else if (!newValue && enabled) {
      // Disabling - free
      await updateProductTryOn(false);
    }
  };

  const confirmEnable = async () => {
    if (!user) return;

    const totalCredits = getTotalCredits();
    if (totalCredits < sellerCreditCost) {
      toast.error(`Insufficient credits. You need ${sellerCreditCost} credits to enable Virtual Try-On.`);
      setShowConfirmDialog(false);
      return;
    }

    setIsProcessing(true);

    try {
      // Deduct credits
      const deducted = await deductCredits(sellerCreditCost);
      if (!deducted) {
        toast.error("Failed to deduct credits");
        return;
      }

      // Enable the feature
      await updateProductTryOn(true);
      
      // Log the transaction
      await supabase.from('virtual_tryon_usage').insert({
        user_id: user.id,
        product_id: productId,
        credits_used: sellerCreditCost,
        custom_prompt: 'Seller enabled Virtual Try-On'
      });

      toast.success("Virtual Try-On enabled for this product!");
      refetch();
    } catch (error) {
      console.error('Error enabling Virtual Try-On:', error);
      toast.error("Failed to enable Virtual Try-On");
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
    }
  };

  const updateProductTryOn = async (value: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ virtual_tryon_enabled: value })
        .eq('id', productId);

      if (error) throw error;

      setEnabled(value);
      onToggle?.(value);
      
      if (!value) {
        toast.success("Virtual Try-On disabled for this product");
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error("Failed to update product");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <div>
              <Label className="font-medium">Virtual Try-On</Label>
              <p className="text-xs text-muted-foreground">
                Let buyers see themselves with your product
              </p>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {enabled ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Enabled - Buyers can use Virtual Try-On</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Coins className="w-4 h-4" />
            <span>Enable for {sellerCreditCost} credits</span>
          </div>
        )}
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Enable Virtual Try-On
            </DialogTitle>
            <DialogDescription>
              Enable Virtual Try-On for "{productName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Setup Cost</span>
                <span className="text-lg font-bold text-primary">{sellerCreditCost} credits</span>
              </div>
              <p className="text-xs text-muted-foreground">
                One-time payment to enable this feature for buyers
              </p>
            </Card>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your credit balance:</span>
              <span className="font-medium">{getTotalCredits()} credits</span>
            </div>

            {getTotalCredits() < sellerCreditCost && (
              <p className="text-sm text-destructive">
                You need {sellerCreditCost - getTotalCredits()} more credits to enable this feature.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmEnable}
                disabled={isProcessing || getTotalCredits() < sellerCreditCost}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 mr-2" />
                    Pay {sellerCreditCost} Credits
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
