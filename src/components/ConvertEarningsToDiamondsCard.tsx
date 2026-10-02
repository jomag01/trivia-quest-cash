import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gem, Loader2 } from "lucide-react";

/** Lets users turn referral earnings into diamonds to pay for live passes and other in-app features. */
export default function ConvertEarningsToDiamondsCard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [price, setPrice] = useState(10);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: w }, { data: s }] = await Promise.all([
      supabase.from("user_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("treasure_admin_settings").select("setting_key, setting_value").in("setting_key", ["earnings_to_diamond_price", "diamond_base_price"]),
    ]);
    setBalance(Number((w as any)?.balance || 0));
    const m = Object.fromEntries((s || []).map((r: any) => [r.setting_key, Number(r.setting_value)]));
    setPrice(m.earnings_to_diamond_price || m.diamond_base_price || 10);
  };
  useEffect(() => { load(); }, [user]);

  const n = Number(amount) || 0;
  const diamonds = Math.floor(n / price);

  const convert = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("convert_earnings_to_diamonds", { _amount: n });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Added ${(data as any)?.diamonds} diamonds`);
    setAmount("");
    load();
  };

  if (!user) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Gem className="h-4 w-4 text-primary" /> Convert earnings to diamonds</CardTitle>
        <CardDescription>Use diamonds to pay for live passes, extra live hours and more. 1 diamond = ₱{price.toFixed(2)}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">Referral earnings available: <b>₱{balance.toFixed(2)}</b></p>
        <div className="flex gap-2">
          <Input type="number" min={0} placeholder="Amount in ₱" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button variant="outline" onClick={() => setAmount(String(balance))}>Max</Button>
        </div>
        <Button className="w-full" disabled={busy || diamonds < 1 || n > balance} onClick={convert}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Get {diamonds} diamond{diamonds === 1 ? "" : "s"}
        </Button>
      </CardContent>
    </Card>
  );
}
