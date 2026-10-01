import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

type Row = {
  id: string; user_id: string; plan_code: string; amount: number; status: string; proof_url: string | null;
  reference_number: string | null; created_at: string; admin_note: string | null;
  profile?: { full_name: string | null; email: string | null } | null;
};

export default function LivePassPaymentsReview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("pending_review");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("live_session_passes")
      .select("id,user_id,plan_code,amount,status,proof_url,reference_number,created_at,admin_note")
      .eq("payment_method", "manual_gcash").eq(filter === "all" ? "payment_method" : "status", filter === "all" ? "manual_gcash" : filter)
      .order("created_at", { ascending: false }).limit(100);
    const list = (data || []) as Row[];
    const ids = [...new Set(list.map((r) => r.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      const m = new Map((profs || []).map((p: any) => [p.id, p]));
      list.forEach((r) => { r.profile = m.get(r.user_id) as any; });
    }
    setRows(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const review = async (id: string, approve: boolean) => {
    setBusy(id);
    const { error } = await supabase.rpc("admin_review_live_pass", { _pass_id: id, _approve: approve, _note: notes[id] || null });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Approved — pass activated and commissions paid" : "Payment rejected");
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Live Pass GCash Payments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="pending_review">Waiting</TabsTrigger>
            <TabsTrigger value="paid">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments here.</p>
        ) : rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row">
            {r.proof_url && (
              <a href={r.proof_url} target="_blank" rel="noreferrer" className="shrink-0">
                <img src={r.proof_url} alt="Payment proof" className="h-40 w-32 rounded object-cover" />
              </a>
            )}
            <div className="flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.profile?.full_name || "User"}</span>
                <span className="text-muted-foreground">{r.profile?.email}</span>
                <Badge variant={r.status === "paid" || r.status === "used" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status.replace("_", " ")}</Badge>
              </div>
              <p>Plan: <b className="capitalize">{r.plan_code}</b> · Amount: <b>₱{Number(r.amount).toFixed(2)}</b></p>
              <p>Reference: {r.reference_number || "-"}</p>
              <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              {r.admin_note && <p className="text-xs">Note: {r.admin_note}</p>}
              {r.status === "pending_review" && (
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Input placeholder="Note (optional, shown if rejected)" value={notes[r.id] || ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                  <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)}><Check className="mr-1 h-4 w-4" />Approve</Button>
                  <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => review(r.id, false)}><X className="mr-1 h-4 w-4" />Reject</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
