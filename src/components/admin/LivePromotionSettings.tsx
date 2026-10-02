import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

type Pkg = {
  code: string; name: string; description: string | null; placement: string; hours: number; priority: number;
  price_cash: number; price_diamonds: number; price_credits: number; is_active: boolean; sort_order: number;
};

export default function LivePromotionSettings() {
  const [rows, setRows] = useState<Pkg[]>([]);
  const [stats, setStats] = useState({ count: 0, revenue: 0 });
  const [newCode, setNewCode] = useState("");

  const load = async () => {
    const { data } = await supabase.from("live_promotion_packages").select("*").order("sort_order");
    setRows((data as Pkg[]) || []);
    const { data: promos } = await supabase.from("live_stream_promotions").select("amount").limit(10000);
    setStats({ count: promos?.length || 0, revenue: (promos || []).reduce((s, p: any) => s + Number(p.amount || 0), 0) });
  };
  useEffect(() => { load(); }, []);

  const upd = (code: string, patch: Partial<Pkg>) => setRows((rs) => rs.map((r) => (r.code === code ? { ...r, ...patch } : r)));
  const save = async (r: Pkg) => {
    const { code, ...rest } = r;
    const { error } = await supabase.from("live_promotion_packages").update({
      ...rest, hours: Number(r.hours), priority: Number(r.priority), price_cash: Number(r.price_cash),
      price_diamonds: Number(r.price_diamonds), price_credits: Number(r.price_credits), updated_at: new Date().toISOString(),
    }).eq("code", code);
    error ? toast.error(error.message) : toast.success("Saved");
  };
  const add = async () => {
    const code = newCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!code) return toast.error("Enter a short code");
    const { error } = await supabase.from("live_promotion_packages").insert({ code, name: "New promotion", sort_order: rows.length + 1 });
    if (error) return toast.error(error.message);
    setNewCode(""); load();
  };
  const del = async (code: string) => {
    const { error } = await supabase.from("live_promotion_packages").delete().eq("code", code);
    if (error) toast.error("This promotion has been bought before, so switch it off instead."); else load();
  };

  const num = (r: Pkg, k: keyof Pkg, label: string) => (
    <div><Label className="text-xs">{label}</Label>
      <Input type="number" min={0} value={r[k] as number} onChange={(e) => upd(r.code, { [k]: e.target.value } as any)} /></div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Live Promotions</CardTitle>
          <CardDescription>
            Sellers pay to push their live to the top of the Live page or the front of the Shop. Higher priority shows first.
            Leave a price at 0 to hide that payment option. Commissions are set under Paid Feature Commissions → "Live promotions".
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{stats.count} promotions sold · ₱{stats.revenue.toFixed(2)} revenue</CardContent>
      </Card>
      {rows.map((r) => (
        <Card key={r.code}><CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Input className="font-medium" value={r.name} onChange={(e) => upd(r.code, { name: e.target.value })} />
            <Switch checked={r.is_active} onCheckedChange={(v) => upd(r.code, { is_active: v })} />
            <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => del(r.code)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Input placeholder="Description" value={r.description || ""} onChange={(e) => upd(r.code, { description: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label className="text-xs">Where it shows</Label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={r.placement} onChange={(e) => upd(r.code, { placement: e.target.value })}>
                <option value="live_top">Top of Live page</option><option value="shop_front">Front of Shop + top of Live</option>
              </select></div>
            {num(r, "hours", "Hours")}
            {num(r, "priority", "Priority (higher = first)")}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {num(r, "price_cash", "Price (₱ Cash Wallet)")}
            {num(r, "price_diamonds", "Price (diamonds)")}
            {num(r, "price_credits", "Price (credits)")}
          </div>
          <Button size="sm" onClick={() => save(r)}>Save</Button>
        </CardContent></Card>
      ))}
      <Card><CardContent className="flex gap-2 p-4">
        <Input placeholder="New promotion code (e.g. boost_6h)" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
        <Button onClick={add}>Add</Button>
      </CardContent></Card>
    </div>
  );
}
