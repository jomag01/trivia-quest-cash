import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

const peso = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function Profit() {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Record<string, number> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    supabase.rpc("get_platform_profit_summary", { _days: days }).then(({ data, error }) => {
      if (error) setErr(error.message); else { setErr(null); setD(data as Record<string, number>); }
    });
  }, [days]);
  const cards: [string, string][] = d ? [
    ["Gross sales", peso(d.gross_sales)], ["Orders", String(d.orders)],
    ["Product margin", peso(d.gross_margin)], ["Commissions paid", peso(d.commissions_paid)],
    ["Net platform profit", peso(d.net_profit)], ["New users", String(d.new_users)],
    ["Travel partner clicks", String(d.travel_clicks)],
  ] : [];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{[7, 30, 90, 365].map(n => <Button key={n} size="sm" variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n} days</Button>)}</div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([l, v]) => <Card key={l}><CardContent className="p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold text-foreground">{v}</div></CardContent></Card>)}
      </div>
      <p className="text-xs text-muted-foreground">Product margin = sale price minus seller cost, for non-cancelled orders. Net profit = margin minus affiliate commissions.</p>
    </div>
  );
}

function Fees() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => supabase.from("platform_fees").select("*").order("applies_to").then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const save = async (r: any) => {
    const { error } = await supabase.from("platform_fees").update({
      fee_type: r.fee_type, fee_value: Number(r.fee_value), is_active: r.is_active, label: r.label, updated_at: new Date().toISOString(),
    }).eq("id", r.id);
    error ? toast.error(error.message) : toast.success("Fee saved");
  };
  const upd = (i: number, k: string, v: any) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <Card key={r.id}><CardContent className="p-4 grid gap-3 md:grid-cols-[1fr_120px_120px_auto_auto] items-center">
          <div><Input value={r.label} onChange={e => upd(i, "label", e.target.value)} /><Badge variant="secondary" className="mt-1 capitalize">{r.applies_to}</Badge></div>
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={r.fee_type} onChange={e => upd(i, "fee_type", e.target.value)}>
            <option value="percentage">Percent %</option><option value="fixed">Fixed ₱</option>
          </select>
          <Input type="number" min={0} value={r.fee_value} onChange={e => upd(i, "fee_value", e.target.value)} />
          <div className="flex items-center gap-2"><Switch checked={r.is_active} onCheckedChange={v => upd(i, "is_active", v)} /><span className="text-sm text-foreground">{r.is_active ? "On" : "Off"}</span></div>
          <Button size="sm" onClick={() => save(r)}>Save</Button>
        </CardContent></Card>
      ))}
      <p className="text-xs text-muted-foreground">Fees are off until you switch them on.</p>
    </div>
  );
}

function Partners() {
  const [rows, setRows] = useState<any[]>([]);
  const [n, setN] = useState({ name: "", category: "hotel", description: "", url_template: "" });
  const load = () => supabase.from("travel_partners").select("*").order("sort_order").then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!n.name.trim() || !/^https:\/\//.test(n.url_template)) return toast.error("Name and an https:// link are required");
    const { error } = await supabase.from("travel_partners").insert({ ...n, sort_order: rows.length + 1 });
    if (error) return toast.error(error.message);
    setN({ name: "", category: "hotel", description: "", url_template: "" }); load();
  };
  const save = async (r: any) => {
    const { error } = await supabase.from("travel_partners").update({ url_template: r.url_template, is_active: r.is_active, description: r.description }).eq("id", r.id);
    error ? toast.error(error.message) : toast.success("Saved");
  };
  const del = async (id: string) => { await supabase.from("travel_partners").delete().eq("id", id); load(); };
  const upd = (i: number, k: string, v: any) => setRows(rs => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Paste your affiliate link from each partner. Use <code>{"{q}"}</code> where the search destination should go.</p>
      {rows.map((r, i) => (
        <Card key={r.id}><CardContent className="p-4 grid gap-2 md:grid-cols-[160px_1fr_auto_auto_auto] items-center">
          <div><div className="font-semibold text-foreground">{r.name}</div><Badge variant="secondary" className="capitalize">{r.category}</Badge></div>
          <Input value={r.url_template} onChange={e => upd(i, "url_template", e.target.value)} />
          <Switch checked={r.is_active} onCheckedChange={v => upd(i, "is_active", v)} />
          <Button size="sm" onClick={() => save(r)}>Save</Button>
          <Button size="icon" variant="ghost" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
        </CardContent></Card>
      ))}
      <Card><CardHeader><CardTitle className="text-base">Add partner</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">
        <Input placeholder="Name (e.g. Cebu Pacific)" value={n.name} onChange={e => setN({ ...n, name: e.target.value })} />
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm text-foreground" value={n.category} onChange={e => setN({ ...n, category: e.target.value })}>
          {["flight", "hotel", "tour", "car", "other"].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input placeholder="Short description" value={n.description} onChange={e => setN({ ...n, description: e.target.value })} />
        <Input placeholder="https://partner.com/search?q={q}&aid=YOURID" value={n.url_template} onChange={e => setN({ ...n, url_template: e.target.value })} />
        <Button onClick={add} className="md:col-span-2">Add partner</Button>
      </CardContent></Card>
    </div>
  );
}

function Inquiries() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { supabase.from("investor_inquiries").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? [])); }, []);
  if (!rows.length) return <p className="text-sm text-muted-foreground">No investor messages yet. Share triviabees.com/investors.</p>;
  return (
    <div className="space-y-3">{rows.map(r => (
      <Card key={r.id}><CardContent className="p-4 text-sm">
        <div className="flex justify-between"><span className="font-semibold text-foreground">{r.full_name}</span><span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span></div>
        <div className="text-muted-foreground">{r.email}{r.phone ? ` · ${r.phone}` : ""}{r.company ? ` · ${r.company}` : ""}</div>
        {r.investment_range && <Badge className="mt-1">{r.investment_range}</Badge>}
        {r.message && <p className="mt-2 text-foreground whitespace-pre-wrap">{r.message}</p>}
      </CardContent></Card>
    ))}</div>
  );
}

export default function BusinessGrowthAdmin() {
  return (
    <Tabs defaultValue="profit">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="profit">Profit</TabsTrigger>
        <TabsTrigger value="fees">Platform fees</TabsTrigger>
        <TabsTrigger value="partners">Travel partners</TabsTrigger>
        <TabsTrigger value="investors">Investor messages</TabsTrigger>
      </TabsList>
      <TabsContent value="profit"><Profit /></TabsContent>
      <TabsContent value="fees"><Fees /></TabsContent>
      <TabsContent value="partners"><Partners /></TabsContent>
      <TabsContent value="investors"><Inquiries /></TabsContent>
    </Tabs>
  );
}
