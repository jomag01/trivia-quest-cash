import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Radio, Loader2 } from "lucide-react";

interface Seller { id: string; full_name: string | null; email: string | null; avatar_url: string | null }

export default function LiveSellingAccessSettings() {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [access, setAccess] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url")
          .eq("is_verified_seller", true).order("full_name"),
        supabase.from("live_selling_access").select("user_id, is_approved"),
      ]);
      setSellers((s as Seller[]) || []);
      setAccess(Object.fromEntries((a || []).map((r) => [r.user_id, r.is_approved])));
      setLoading(false);
    })();
  }, []);

  const toggle = async (id: string, on: boolean) => {
    setAccess((p) => ({ ...p, [id]: on }));
    const { error } = await supabase.from("live_selling_access").upsert({
      user_id: id, is_approved: on, approved_by: user?.id, updated_at: new Date().toISOString(),
    });
    if (error) {
      setAccess((p) => ({ ...p, [id]: !on }));
      return toast.error(error.message);
    }
    toast.success(on ? "Live selling approved" : "Live selling access removed");
  };

  const q = search.toLowerCase();
  const list = sellers.filter((s) => `${s.full_name} ${s.email}`.toLowerCase().includes(q));
  const approvedCount = Object.values(access).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radio className="w-5 h-5 text-destructive" /> Live Selling Access</CardTitle>
        <CardDescription>
          Approve which verified sellers can see the Go Live button. {approvedCount} approved.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search sellers by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : list.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No verified sellers found.</p>
        ) : (
          <div className="divide-y border rounded-lg">
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <img src={s.avatar_url || "/placeholder.svg"} alt="" className="w-9 h-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.full_name || "Unnamed seller"}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                </div>
                {access[s.id] && <Badge variant="destructive">LIVE enabled</Badge>}
                <Switch checked={!!access[s.id]} onCheckedChange={(v) => toggle(s.id, v)} aria-label="Allow live selling" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
