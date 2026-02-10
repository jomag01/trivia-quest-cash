import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, Calculator, PackageX } from "lucide-react";
import { toast } from "sonner";

interface UserOffer {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_image: string | null;
  provider_id: string;
  provider_name: string;
  interest_rate: number;
  available_terms: number[];
  min_amount: number;
}

const InstallmentOffers = () => {
  const { user } = useAuth();
  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyDialog, setApplyDialog] = useState<UserOffer | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchOffers();
    fetchWallet();
  }, [user]);

  const fetchWallet = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cash_wallets")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setWalletBalance(data?.balance || 0);
  };

  const fetchOffers = async () => {
    if (!user) return;
    setLoading(true);

    // Get offers assigned to this user by admin
    const { data: userOffers } = await supabase
      .from("user_installment_offers")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!userOffers?.length) {
      setOffers([]);
      setLoading(false);
      return;
    }

    const productIds = [...new Set(userOffers.map(o => o.product_id))];
    const providerIds = [...new Set(userOffers.map(o => o.provider_id))];

    const [prodRes, provRes] = await Promise.all([
      supabase.from("products").select("id, name, base_price, image_url").in("id", productIds),
      supabase.from("installment_providers").select("*").in("id", providerIds).eq("is_active", true),
    ]);

    const products = prodRes.data || [];
    const providers = provRes.data || [];

    const mapped: UserOffer[] = [];
    for (const o of userOffers) {
      const product = products.find(p => p.id === o.product_id);
      const provider = providers.find(p => p.id === o.provider_id);
      if (!product || !provider) continue;
      mapped.push({
        id: o.id,
        product_id: product.id,
        product_name: product.name,
        product_price: product.base_price,
        product_image: product.image_url,
        provider_id: provider.id,
        provider_name: provider.name,
        interest_rate: provider.interest_rate_percent || 0,
        available_terms: provider.available_terms || [3, 6, 12],
        min_amount: provider.min_amount || 0,
      });
    }
    setOffers(mapped);
    setLoading(false);
  };

  const calcMonthly = (price: number, rate: number, months: number) => {
    const total = price * (1 + rate / 100);
    return total / months;
  };

  const handleApply = async () => {
    if (!applyDialog || !selectedTerm || !user) return;
    setSubmitting(true);
    const term = parseInt(selectedTerm);
    const monthly = calcMonthly(applyDialog.product_price, applyDialog.interest_rate, term);
    const total = monthly * term;
    const downpayment = Math.round(monthly * 100) / 100; // First month as downpayment

    const { error } = await supabase.from("installment_applications").insert({
      user_id: user.id,
      product_id: applyDialog.product_id,
      provider_id: applyDialog.provider_id,
      term_months: term,
      monthly_payment: Math.round(monthly * 100) / 100,
      total_amount: Math.round(total * 100) / 100,
      downpayment_amount: downpayment,
      status: "pending",
      offer_id: applyDialog.id,
    });

    setSubmitting(false);
    if (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application: " + error.message);
      return;
    }
    toast.success("Installment application submitted! Waiting for admin approval. Downpayment will be deducted from your wallet upon approval.");
    setApplyDialog(null);
    setSelectedTerm("");
  };

  if (loading) return <Card className="p-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></Card>;

  return (
    <Card className="p-6 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">Installment Offers</h3>
        {offers.length > 0 && (
          <Badge variant="secondary" className="ml-auto">{offers.length} available</Badge>
        )}
      </div>

      {offers.length === 0 ? (
        <div className="text-center py-8">
          <PackageX className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No installment offers available for you yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Admin will assign installment offers when you qualify.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">Products available for installment payment — assigned by admin</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {offers.map((offer) => (
              <Card key={offer.id} className="p-3 flex gap-3">
                {offer.product_image ? (
                  <img src={offer.product_image} alt="" className="w-16 h-16 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{offer.product_name}</p>
                  <p className="text-xs text-muted-foreground">₱{offer.product_price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">via {offer.provider_name} · {offer.interest_rate}%</p>
                  <p className="text-xs text-primary font-medium">
                    From ₱{Math.round(calcMonthly(offer.product_price, offer.interest_rate, Math.max(...offer.available_terms))).toLocaleString()}/mo
                  </p>
                </div>
                <Button size="sm" variant="outline" className="self-center shrink-0" onClick={() => { setApplyDialog(offer); setSelectedTerm(""); }}>
                  <Calculator className="w-3.5 h-3.5 mr-1" /> Apply
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Apply Dialog */}
      <Dialog open={!!applyDialog} onOpenChange={(v) => { if (!v) setApplyDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Apply for Installment</DialogTitle></DialogHeader>
          {applyDialog && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{applyDialog.product_name}</p>
                <p className="text-sm text-muted-foreground">Price: ₱{applyDialog.product_price.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Provider: {applyDialog.provider_name} ({applyDialog.interest_rate}% interest)</p>
              </div>
              <div>
                <label className="text-sm font-medium">Select Term</label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger><SelectValue placeholder="Choose months" /></SelectTrigger>
                  <SelectContent>
                    {applyDialog.available_terms.map(t => (
                      <SelectItem key={t} value={t.toString()}>
                        {t} months — ₱{Math.round(calcMonthly(applyDialog.product_price, applyDialog.interest_rate, t)).toLocaleString()}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTerm && (
                <Card className="p-3 bg-muted/50 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Monthly Payment</span>
                    <span className="font-bold">₱{Math.round(calcMonthly(applyDialog.product_price, applyDialog.interest_rate, parseInt(selectedTerm))).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total Amount</span>
                    <span className="font-bold">₱{Math.round(calcMonthly(applyDialog.product_price, applyDialog.interest_rate, parseInt(selectedTerm)) * parseInt(selectedTerm)).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Downpayment (1st month)</span>
                    <span className="font-bold">₱{Math.round(calcMonthly(applyDialog.product_price, applyDialog.interest_rate, parseInt(selectedTerm))).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>Your Wallet Balance</span>
                    <span>₱{walletBalance.toLocaleString()}</span>
                  </div>
                </Card>
              )}
              <p className="text-xs text-muted-foreground">
                Upon admin approval, the downpayment (1st month) will be deducted from your cash wallet balance.
              </p>
              <Button className="w-full" onClick={handleApply} disabled={!selectedTerm || submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit Application
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default InstallmentOffers;
