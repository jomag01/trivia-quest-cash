import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GitBranch, Diamond, TrendingUp, Users, Award, Wallet, Loader2, ArrowRight, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EarningsSource {
  id: string;
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  selected: boolean;
}

interface ConsolidateEarningsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export default function ConsolidateEarningsDialog({
  open,
  onOpenChange,
  userId,
  onSuccess
}: ConsolidateEarningsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [earnings, setEarnings] = useState<EarningsSource[]>([]);
  const [diamondPrice, setDiamondPrice] = useState(10);
  const [totalDiamonds, setTotalDiamonds] = useState(0);

  useEffect(() => {
    if (open) {
      fetchAllEarnings();
    }
  }, [open, userId]);

  const fetchAllEarnings = async () => {
    setLoading(true);
    try {
      // Fetch all commission types in parallel
      const [unilevelResult, stairstepResult, leadershipResult, binaryResult, diamondsResult, diamondPriceResult] = await Promise.all([
        // Unilevel commissions
        supabase
          .from("commissions")
          .select("amount")
          .eq("user_id", userId)
          .in("commission_type", ["unilevel", "ai_credit_unilevel", "direct_referral"]),
        
        // Stairstep commissions
        supabase
          .from("commissions")
          .select("amount")
          .eq("user_id", userId)
          .in("commission_type", ["stairstep", "ai_credit_stairstep"]),
        
        // Leadership commissions
        supabase
          .from("leadership_commissions")
          .select("amount")
          .eq("upline_id", userId),
        
        // Binary commissions
        supabase
          .from("binary_commissions")
          .select("amount")
          .eq("user_id", userId),
        
        // Diamond balance
        supabase
          .from("treasure_wallet")
          .select("diamonds")
          .eq("user_id", userId)
          .maybeSingle(),
        
        // Diamond price
        supabase
          .from("treasure_admin_settings")
          .select("setting_value")
          .eq("setting_key", "base_diamond_price")
          .maybeSingle()
      ]);

      const unilevelTotal = (unilevelResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const stairstepTotal = (stairstepResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const leadershipTotal = (leadershipResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const binaryTotal = (binaryResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      
      const diamonds = diamondsResult.data?.diamonds || 0;
      const basePrice = diamondPriceResult.data?.setting_value ? parseFloat(diamondPriceResult.data.setting_value) : 10;
      const diamondValue = diamonds * basePrice;

      setTotalDiamonds(diamonds);
      setDiamondPrice(basePrice);

      setEarnings([
        { id: 'unilevel', label: 'Unilevel Commissions', value: unilevelTotal, icon: Users, color: 'text-blue-500', selected: unilevelTotal > 0 },
        { id: 'stairstep', label: 'Stairstep Commissions', value: stairstepTotal, icon: TrendingUp, color: 'text-green-500', selected: stairstepTotal > 0 },
        { id: 'leadership', label: 'Leadership Commissions', value: leadershipTotal, icon: Award, color: 'text-purple-500', selected: leadershipTotal > 0 },
        { id: 'binary', label: 'Binary Commissions', value: binaryTotal, icon: GitBranch, color: 'text-orange-500', selected: binaryTotal > 0 },
        { id: 'diamonds', label: `Diamonds (${diamonds} 💎)`, value: diamondValue, icon: Diamond, color: 'text-cyan-500', selected: diamondValue > 0 },
      ]);
    } catch (error: any) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load earnings");
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = (id: string) => {
    setEarnings(prev => prev.map(e => 
      e.id === id ? { ...e, selected: !e.selected } : e
    ));
  };

  const selectedTotal = earnings.filter(e => e.selected).reduce((sum, e) => sum + e.value, 0);

  const handleTransfer = async () => {
    const selectedEarnings = earnings.filter(e => e.selected && e.value > 0);
    if (selectedEarnings.length === 0) {
      toast.error("Please select at least one earning source");
      return;
    }

    setTransferring(true);
    try {
      // Get current cash wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from("cash_wallets")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (walletError) throw walletError;

      const currentBalance = walletData?.balance || 0;
      const newBalance = currentBalance + selectedTotal;

      // Update cash wallet
      const { error: updateError } = await supabase
        .from("cash_wallets")
        .upsert({
          user_id: userId,
          balance: newBalance,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      // Record the consolidation transaction
      await supabase.from("cash_transactions").insert({
        user_id: userId,
        amount: selectedTotal,
        balance_before: currentBalance,
        balance_after: newBalance,
        transaction_type: 'consolidation',
        description: `Consolidated earnings from: ${selectedEarnings.map(e => e.label).join(', ')}`
      });

      // Clear the transferred commissions (mark as transferred or delete)
      for (const source of selectedEarnings) {
        if (source.id === 'unilevel') {
          await supabase
            .from("commissions")
            .delete()
            .eq("user_id", userId)
            .in("commission_type", ["unilevel", "ai_credit_unilevel", "direct_referral"]);
        } else if (source.id === 'stairstep') {
          await supabase
            .from("commissions")
            .delete()
            .eq("user_id", userId)
            .in("commission_type", ["stairstep", "ai_credit_stairstep"]);
        } else if (source.id === 'leadership') {
          await supabase
            .from("leadership_commissions")
            .delete()
            .eq("upline_id", userId);
        } else if (source.id === 'binary') {
          await supabase
            .from("binary_commissions")
            .delete()
            .eq("user_id", userId);
        } else if (source.id === 'diamonds' && totalDiamonds > 0) {
          await supabase
            .from("treasure_wallet")
            .update({ diamonds: 0 })
            .eq("user_id", userId);
        }
      }

      toast.success(`₱${selectedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })} transferred to cash wallet!`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Failed to transfer earnings");
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Consolidate Earnings
          </DialogTitle>
          <DialogDescription>
            Transfer all your earnings to cash wallet for withdrawal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Earnings Sources */}
            <div className="space-y-2">
              {earnings.map((source) => (
                <Card 
                  key={source.id}
                  className={`cursor-pointer transition-all ${
                    source.selected ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                  } ${source.value === 0 ? 'opacity-50' : ''}`}
                  onClick={() => source.value > 0 && toggleSource(source.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={source.selected} 
                        disabled={source.value === 0}
                        onCheckedChange={() => toggleSource(source.id)}
                      />
                      <source.icon className={`w-5 h-5 ${source.color}`} />
                      <div className="flex-1">
                        <Label className="font-medium cursor-pointer">{source.label}</Label>
                      </div>
                      <div className="font-bold">
                        ₱{source.value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total */}
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-primary" />
                    <span className="font-medium">Total to Transfer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      ₱{selectedTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </span>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cash Wallet</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={transferring || selectedTotal === 0}
                className="flex-1"
              >
                {transferring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  "Transfer to Cash Wallet"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
