import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

type Row = {
  feature_key: string; label: string; category: string; description: string | null;
  commission_type: string; referrer_value: number; upline_value: number;
  unilevel_pct: number; unilevel_levels: number; stairstep_pct: number; leadership_pct: number; is_active: boolean;
};
type Stat = { sales: number; revenue: number; commissions: number };

const CATEGORY_LABEL: Record<string, string> = { live: "Live Selling", ai: "AI Hub", shop: "Shop", ads: "Ads", beesmate: "BeesMate", other: "Other" };

/** Paid items that already have their own commission page. */
const MANAGED_ELSEWHERE = [
  ["Food orders", "Food Commission settings (separate owners)"],
  ["Book Services", "Service Commissions (separate owners)"],
  ["Game credits", "Stair Step MLM (credit purchases)"],
  ["Website Builder plans", "Website Builder Subscriptions"],
  ["Teachers' Resources", "Teachers' Resources commission settings"],
];

function ShopProductPicker() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ id: string; name: string; base_price: number | null; final_price: number | null; network_commission_enabled: boolean }[]>([]);
  const load = async () => {
    let req = supabase.from("products").select("id,name,base_price,final_price,network_commission_enabled").eq("is_active", true).order("network_commission_enabled", { ascending: false }).order("name").limit(50);
    if (q.trim()) req = req.ilike("name", `%${q.trim()}%`);
    const { data } = await req;
    setItems((data as any) || []);
  };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);
  const toggle = async (id: string, v: boolean) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, network_commission_enabled: v } : x)));
    const { error } = await supabase.from("products").update({ network_commission_enabled: v }).eq("id", id);
    if (error) { toast.error(error.message); load(); }
  };
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <p className="text-sm font-medium">Products that pay these commissions</p>
      <Input placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
            <span className="min-w-0 truncate">{p.name}</span>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              profit ₱{Math.max(Number(p.final_price || 0) - Number(p.base_price || 0), 0).toFixed(2)}
              <Switch checked={p.network_commission_enabled} onCheckedChange={(v) => toggle(p.id, v)} />
            </span>
          </div>
        ))}
        {!items.length && <p className="text-xs text-muted-foreground">No products found.</p>}
      </div>
    </div>
  );
}

export default function PaidFeatureCommissionsSettings() {
  const [rows, setRows] = useState<Row[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: plans } = await supabase.from("live_plans").select("code,name,price_per_session,extension_price_per_hour");
    const { data: sales } = await supabase.from("feature_sales").select("feature_key,amount,commissions_paid").limit(10000);
    const { data: existing } = await supabase.from("paid_feature_commissions").select("*");
    const have = new Set((existing || []).map((r) => r.feature_key));
    // Add a row for any live plan or any sold feature that isn't itemized yet
    const missing: { feature_key: string; label: string; category: string }[] = [];
    (plans || []).forEach((p) => { const k = `live_pass_${p.code}`; if (!have.has(k)) { have.add(k); missing.push({ feature_key: k, label: `${p.name} Live pass`, category: "live" }); } });
    (sales || []).forEach((s) => { if (!have.has(s.feature_key)) { have.add(s.feature_key); missing.push({ feature_key: s.feature_key, label: s.feature_key.replace(/_/g, " "), category: s.feature_key.startsWith("ai_") ? "ai" : s.feature_key.startsWith("live_") ? "live" : "other" }); } });
    if (missing.length) await supabase.from("paid_feature_commissions").insert(missing);
    const { data } = await supabase.from("paid_feature_commissions").select("*").order("category").order("feature_key");

    const pm: Record<string, number> = {};
    (plans || []).forEach((p: any) => { pm[`live_pass_${p.code}`] = Number(p.price_per_session); });
    const ext = (plans || []).map((p: any) => Number(p.extension_price_per_hour || 0)).filter(Boolean);
    if (ext.length) pm.live_extension = Math.max(...ext);
    const sm: Record<string, Stat> = {};
    (sales || []).forEach((s) => {
      const k = s.feature_key; sm[k] ||= { sales: 0, revenue: 0, commissions: 0 };
      sm[k].sales++; sm[k].revenue += Number(s.amount); sm[k].commissions += Number(s.commissions_paid);
    });
    setRows((data || []) as Row[]); setPrices(pm); setStats(sm); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = (k: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.feature_key === k ? { ...r, ...patch } : r)));

  const pctTotal = (r: Row) =>
    (r.commission_type === "percentage" ? Number(r.referrer_value) + Number(r.upline_value) : 0) +
    Number(r.unilevel_pct) + Number(r.stairstep_pct) + Number(r.leadership_pct);

  const save = async (r: Row) => {
    const nums = [r.referrer_value, r.upline_value, r.unilevel_pct, r.stairstep_pct, r.leadership_pct];
    if (nums.some((n) => !(Number(n) >= 0))) return toast.error("Values can't be negative");
    if (pctTotal(r) > 100) return toast.error("Total percentage can't be more than 100%");
    setSaving(r.feature_key);
    const { error } = await supabase.from("paid_feature_commissions").update({
      label: r.label, commission_type: r.commission_type, referrer_value: r.referrer_value, upline_value: r.upline_value,
      unilevel_pct: r.unilevel_pct, unilevel_levels: Math.min(10, Math.max(1, Math.round(r.unilevel_levels))),
      stairstep_pct: r.stairstep_pct, leadership_pct: r.leadership_pct,
      is_active: r.is_active, updated_at: new Date().toISOString(),
    }).eq("feature_key", r.feature_key);
    setSaving(null);
    error ? toast.error(error.message) : toast.success(`${r.label} saved`);
  };

  const grouped = useMemo(() => {
    const g: Record<string, Row[]> = {};
    rows.forEach((r) => { (g[r.category] ||= []).push(r); });
    return g;
  }, [rows]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;

  const num = (r: Row, key: keyof Row, label: string, suffix: string, hint?: string) => (
    <div>
      <Label className="text-xs">{label} ({suffix})</Label>
      <Input type="number" min={0} step="0.01" value={r[key] as number} onChange={(e) => update(r.feature_key, { [key]: Number(e.target.value) } as Partial<Row>)} />
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paid Feature Commissions</CardTitle>
          <CardDescription>
            Each paid feature is listed separately. For every sale you choose what goes to the direct referrer, their upline,
            the Unilevel network, Stairstep ranks (step 3 and up) and Leadership (step 5 and up). Percentages are of the price paid.
          </CardDescription>
        </CardHeader>
      </Card>

      {Object.entries(grouped).map(([cat, list]) => (
        <Card key={cat}>
          <CardHeader><CardTitle className="text-lg">{CATEGORY_LABEL[cat] || cat}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {list.map((r) => {
              const st = stats[r.feature_key] || { sales: 0, revenue: 0, commissions: 0 };
              const price = prices[r.feature_key];
              const unit = r.commission_type === "fixed" ? "₱" : "%";
              const total = pctTotal(r);
              return (
                <div key={r.feature_key} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Input className="h-8 font-medium" value={r.label} onChange={(e) => update(r.feature_key, { label: e.target.value })} />
                      {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {price != null && <>Price ₱{price.toFixed(2)} · </>}{st.sales} sold · ₱{st.revenue.toFixed(2)} revenue · ₱{st.commissions.toFixed(2)} paid out
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm"><Switch checked={r.is_active} onCheckedChange={(v) => update(r.feature_key, { is_active: v })} /> Active</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Referral type</Label>
                      <Select value={r.commission_type} onValueChange={(v) => update(r.feature_key, { commission_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed amount (₱)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    {num(r, "referrer_value", "Direct referrer", unit, price != null && r.commission_type === "percentage" ? `= ₱${(price * r.referrer_value / 100).toFixed(2)}` : undefined)}
                    {num(r, "upline_value", "Referrer's upline", unit)}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    {num(r, "unilevel_pct", "Unilevel pool", "%", "Shared across levels")}
                    {num(r, "unilevel_levels", "Unilevel levels", "1-10")}
                    {num(r, "stairstep_pct", "Stairstep pool", "%", "Nearest 2 ranked uplines")}
                    {num(r, "leadership_pct", "Leadership", "%", "Nearest step 5+ upline")}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={total > 100 ? "destructive" : "secondary"}>
                      Total payout: {total.toFixed(2)}%{r.commission_type === "fixed" ? ` + ₱${(Number(r.referrer_value) + Number(r.upline_value)).toFixed(2)}` : ""}
                      {price != null && r.commission_type === "percentage" ? ` (₱${(price * total / 100).toFixed(2)} max per sale)` : ""}
                    </Badge>
                    <Button size="sm" onClick={() => save(r)} disabled={saving === r.feature_key}>
                      {saving === r.feature_key ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
                    </Button>
                  </div>
                </div>
              );
            })}
            {cat === "shop" && <ShopProductPicker />}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Set on their own pages</CardTitle>
          <CardDescription>These paid items already have their own commission settings in the admin menu.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {MANAGED_ELSEWHERE.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-3 border-b py-1 last:border-0"><span>{k}</span><span className="text-muted-foreground text-right">{v}</span></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
