import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Radio } from "lucide-react";
import type { LivePlan } from "@/hooks/useLivePlans";

const FEATURES: { key: keyof LivePlan["features"]; label: string }[] = [
  { key: "chroma_key", label: "Green screen (chroma key)" },
  { key: "auto_bg_removal", label: "Auto background removal" },
  { key: "custom_background", label: "Custom image / video backgrounds" },
  { key: "stickers", label: "Stickers & foreground overlays" },
  { key: "cross_platform", label: "Cross-platform live (Restream: Facebook, YouTube...)" },
];

export default function LivePlansSettings() {
  const [plans, setPlans] = useState<LivePlan[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [stats, setStats] = useState({ count: 0, revenue: 0 });

  useEffect(() => {
    void supabase.from("live_plans").select("*").order("sort_order").then(({ data }) => setPlans((data as unknown as LivePlan[]) || []));
    void supabase.from("live_session_passes").select("amount, status").in("status", ["paid", "used"]).then(({ data }) =>
      setStats({ count: data?.length || 0, revenue: (data || []).reduce((s, r: any) => s + Number(r.amount), 0) }));
  }, []);

  const patch = (code: string, p: Partial<LivePlan>) => setPlans((ps) => ps.map((x) => (x.code === code ? { ...x, ...p } : x)));

  const save = async (plan: LivePlan) => {
    if (!(plan.price_per_session >= 0)) return toast.error("Enter a valid price");
    setSaving(plan.code);
    const { error } = await supabase.from("live_plans").update({
      name: plan.name, description: plan.description, price_per_session: plan.price_per_session, max_hours: Math.min(24, Math.max(1, Math.round(plan.max_hours ?? 4))), extension_price_per_hour: Math.max(0, plan.extension_price_per_hour ?? 0), price_diamonds: Math.max(0, Math.round(plan.price_diamonds ?? 0)), price_credits: Math.max(0, Math.round(plan.price_credits ?? 0)), extension_diamonds_per_hour: Math.max(0, Math.round(plan.extension_diamonds_per_hour ?? 0)), extension_credits_per_hour: Math.max(0, Math.round(plan.extension_credits_per_hour ?? 0)),
      features: plan.features, is_active: plan.is_active, updated_at: new Date().toISOString(),
    }).eq("code", plan.code);
    setSaving(null);
    error ? toast.error(error.message) : toast.success(`${plan.name} saved`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-destructive" /> Live Plans</CardTitle>
          <CardDescription>
            Sellers buy a pass for each live session. Sellers approved in Live Selling Access go live on Basic for free.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-6 text-sm">
          <div><p className="text-muted-foreground">Passes sold</p><p className="text-xl font-bold">{stats.count}</p></div>
          <div><p className="text-muted-foreground">Pass revenue</p><p className="text-xl font-bold">₱{stats.revenue.toLocaleString()}</p></div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.code}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{plan.code.toUpperCase()} <Badge variant="outline" className="ml-2">{plan.is_active ? "On" : "Off"}</Badge></CardTitle>
              <Switch checked={plan.is_active} onCheckedChange={(v) => patch(plan.code, { is_active: v })} />
            </CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Name</Label><Input value={plan.name} onChange={(e) => patch(plan.code, { name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea rows={2} value={plan.description} onChange={(e) => patch(plan.code, { description: e.target.value })} /></div>
              <div><Label>Price per live session (₱)</Label>
                <Input type="number" min={0} value={plan.price_per_session} onChange={(e) => patch(plan.code, { price_per_session: Number(e.target.value) })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Hours included per live</Label>
                  <Input type="number" min={1} max={24} value={plan.max_hours ?? 4} onChange={(e) => patch(plan.code, { max_hours: Number(e.target.value) })} /></div>
                <div><Label>Price per extra hour (₱)</Label>
                  <Input type="number" min={0} value={plan.extension_price_per_hour ?? 0} onChange={(e) => patch(plan.code, { extension_price_per_hour: Number(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Pass price in diamonds</Label>
                  <Input type="number" min={0} value={plan.price_diamonds ?? 0} onChange={(e) => patch(plan.code, { price_diamonds: Number(e.target.value) })} /></div>
                <div><Label>Pass price in credits</Label>
                  <Input type="number" min={0} value={plan.price_credits ?? 0} onChange={(e) => patch(plan.code, { price_credits: Number(e.target.value) })} /></div>
                <div><Label>Extra hour in diamonds</Label>
                  <Input type="number" min={0} value={plan.extension_diamonds_per_hour ?? 0} onChange={(e) => patch(plan.code, { extension_diamonds_per_hour: Number(e.target.value) })} /></div>
                <div><Label>Extra hour in credits</Label>
                  <Input type="number" min={0} value={plan.extension_credits_per_hour ?? 0} onChange={(e) => patch(plan.code, { extension_credits_per_hour: Number(e.target.value) })} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Set 0 to turn off paying with diamonds or credits.</p>
              <div className="space-y-2">
                <Label>Features</Label>
                {FEATURES.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-sm">
                    <span>{f.label}</span>
                    <Switch checked={!!plan.features?.[f.key]} onCheckedChange={(v) => patch(plan.code, { features: { ...plan.features, [f.key]: v } })} />
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={() => save(plan)} disabled={saving === plan.code}>
                {saving === plan.code && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
