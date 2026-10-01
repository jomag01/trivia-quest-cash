import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Row = { feature_key: string; label: string; category: string; commission_type: string; referrer_value: number; upline_value: number; is_active: boolean };
type Stat = { sales: number; revenue: number; commissions: number };

export default function PaidFeatureCommissionsSettings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Make sure every live plan has a commission row
    const { data: plans } = await supabase.from("live_plans").select("code,name,price_per_session");
    const { data: existing } = await supabase.from("paid_feature_commissions").select("*").order("category").order("feature_key");
    const have = new Set((existing || []).map((r) => r.feature_key));
    const missing = (plans || []).filter((p) => !have.has(`live_pass_${p.code}`));
    if (missing.length) {
      await supabase.from("paid_feature_commissions").insert(missing.map((p) => ({ feature_key: `live_pass_${p.code}`, label: `${p.name} Live pass`, category: "live" })));
    }
    const { data } = missing.length ? await supabase.from("paid_feature_commissions").select("*").order("category").order("feature_key") : { data: existing };
    const pm: Record<string, number> = {};
    (plans || []).forEach((p) => { pm[`live_pass_${p.code}`] = Number(p.price_per_session); });
    const { data: sales } = await supabase.from("feature_sales").select("feature_key,amount,commissions_paid").limit(5000);
    const sm: Record<string, Stat> = {};
    (sales || []).forEach((s) => {
      const k = s.feature_key; sm[k] ||= { sales: 0, revenue: 0, commissions: 0 };
      sm[k].sales++; sm[k].revenue += Number(s.amount); sm[k].commissions += Number(s.commissions_paid);
    });
    setRows((data || []) as Row[]); setPrices(pm); setStats(sm); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (k: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.feature_key === k ? { ...r, ...patch } : r)));

  const save = async (r: Row) => {
    if (r.referrer_value < 0 || r.upline_value < 0) return toast.error("Values can't be negative");
    if (r.commission_type === "percentage" && r.referrer_value + r.upline_value > 100) return toast.error("Total percentage can't exceed 100%");
    setSaving(r.feature_key);
    const { error } = await supabase.from("paid_feature_commissions").update({
      label: r.label, commission_type: r.commission_type, referrer_value: r.referrer_value, upline_value: r.upline_value,
      is_active: r.is_active, updated_at: new Date().toISOString(),
    }).eq("feature_key", r.feature_key);
    setSaving(null);
    error ? toast.error(error.message) : toast.success("Saved");
  };

  const calc = (r: Row, v: number) => {
    const price = prices[r.feature_key] || 0;
    return r.commission_type === "fixed" ? v : (price * v) / 100;
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paid Feature Commissions</CardTitle>
        <CardDescription>Set how much the person who referred a buyer (Level 1) and their upline (Level 2) earn whenever a paid feature is bought — by Cash Wallet, GCash/card, or approved GCash proof.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r) => {
          const st = stats[r.feature_key] || { sales: 0, revenue: 0, commissions: 0 };
          return (
            <div key={r.feature_key} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Input className="h-8 font-medium" value={r.label} onChange={(e) => update(r.feature_key, { label: e.target.value })} />
                  <p className="mt-1 text-xs text-muted-foreground">Price: ₱{(prices[r.feature_key] || 0).toFixed(2)} · {st.sales} sold · ₱{st.revenue.toFixed(2)} revenue · ₱{st.commissions.toFixed(2)} paid out</p>
                </div>
                <div className="flex items-center gap-2 text-sm"><Switch checked={r.is_active} onCheckedChange={(v) => update(r.feature_key, { is_active: v })} /> Active</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Type</Label>
                  <Select value={r.commission_type} onValueChange={(v) => update(r.feature_key, { commission_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed (₱)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Referrer (Level 1)</Label>
                  <Input type="number" min={0} value={r.referrer_value} onChange={(e) => update(r.feature_key, { referrer_value: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">= ₱{calc(r, r.referrer_value).toFixed(2)} per sale</p>
                </div>
                <div>
                  <Label>Affiliate upline (Level 2)</Label>
                  <Input type="number" min={0} value={r.upline_value} onChange={(e) => update(r.feature_key, { upline_value: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">= ₱{calc(r, r.upline_value).toFixed(2)} per sale</p>
                </div>
              </div>
              <Button size="sm" onClick={() => save(r)} disabled={saving === r.feature_key}>
                {saving === r.feature_key ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
