import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Shows the seller's live-selling earnings: on hold vs released. Auto-releases matured earnings. */
export default function LiveSellerEarningsCard() {
  const { user } = useAuth();
  const [onHold, setOnHold] = useState(0);
  const [released, setReleased] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await supabase.rpc("release_my_seller_earnings" as any);
      const { data } = await supabase.from("seller_pending_earnings" as any).select("amount, status").eq("seller_id", user.id);
      const rows = (data || []) as any[];
      setOnHold(rows.filter((r) => r.status === "on_hold").reduce((s, r) => s + Number(r.amount), 0));
      setReleased(rows.filter((r) => r.status === "released").reduce((s, r) => s + Number(r.amount), 0));
    };
    load();
    const ch = supabase.channel(`live-earn-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_pending_earnings", filter: `seller_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-2"><Radio className="h-4 w-4 text-destructive" /><h3 className="font-semibold">Live selling earnings</h3></div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-muted-foreground">On hold</p><p className="text-lg font-bold">₱{onHold.toLocaleString()}</p></div>
        <div><p className="text-muted-foreground">Released to wallet</p><p className="text-lg font-bold text-primary">₱{released.toLocaleString()}</p></div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Money unlocks to your Cash Wallet when the order is delivered, or after 15 days.</p>
    </Card>
  );
}
