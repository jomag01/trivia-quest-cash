import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";

interface InstallmentProduct {
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
  const [offers, setOffers] = useState<InstallmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyDialog, setApplyDialog] = useState<InstallmentProduct | null>(null);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchOffers();
  }, [user]);

  const fetchOffers = async () => {
    setLoading(true);
    // Get all enabled installment settings
    const { data: settings } = await supabase
      .from("product_installment_settings")
      .select("product_id, provider_id, is_enabled")
      .eq("is_enabled", true);

    if (!settings?.length) { setLoading(false); return; }

    const productIds = [...new Set(settings.map(s => s.product_id))];
    const providerIds = [...new Set(settings.map(s => s.provider_id))];

    const [prodRes, provRes] = await Promise.all([
      supabase.from("products").select("id, name, base_price, image_url").in("id", productIds),
      supabase.from("installment_providers").select("*").in("id", providerIds).eq("is_active", true),
    ]);

    const products = prodRes.data || [];
    const providers = provRes.data || [];

    const mapped: InstallmentProduct[] = [];
    for (const s of settings) {
      const product = products.find(p => p.id === s.product_id);
      const provider = providers.find(p => p.id === s.provider_id);
      if (!product || !provider) continue;
      if (product.base_price < (provider.min_amount || 0)) continue;
      mapped.push({
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

    const { error } = await supabase.from("installment_applications").insert({
      user_id: user.id,
      product_id: applyDialog.product_id,
      provider_id: applyDialog.provider_id,
      term_months: term,
      monthly_payment: Math.round(monthly * 100) / 100,
      total_amount: Math.round(total * 100) / 100,
      status: "pending",
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to submit application");
      return;
    }
    toast.success("Installment application submitted! Waiting for admin approval.");
    setApplyDialog(null);
    setSelectedTerm("");
  };

  if (loading) return <Card className="p-6"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></Card>;
  if (!offers.length) return null;

  return (
    <Card className="p-6 border-primary/20">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">Installment Offers</h3>
        <Badge variant="secondary" className="ml-auto">{offers.length} available</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Products available for installment payment plans</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((offer, i) => (
          <Card key={`${offer.product_id}-${offer.provider_id}-${i}`} className="p-3 flex gap-3">
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
                <Card className="p-3 bg-muted/50">
                  <div className="flex justify-between text-sm">
                    <span>Monthly</span>
                    <span className="font-bold">₱{Math.round(calcMonthly(applyDialog.product_price, applyDialog.interest_rate, parseInt(selectedTerm))).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Total</span>
                    <span className="font-bold">₱{Math.round(calcMonthly(applyDialog.product_price, applyDialog.interest_rate, parseInt(selectedTerm)) * parseInt(selectedTerm)).toLocaleString()}</span>
                  </div>
                </Card>
              )}
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
