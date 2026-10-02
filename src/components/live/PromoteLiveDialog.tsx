import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";

type Pkg = {
  code: string; name: string; description: string | null; placement: string; hours: number;
  price_cash: number; price_diamonds: number; price_credits: number;
};

/** Lets a seller pay to push their running live to the top of Live / front of the Shop. */
export default function PromoteLiveDialog({ streamId, open, onOpenChange }: { streamId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [pkgs, setPkgs] = useState<Pkg[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.from("live_promotion_packages").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => setPkgs((data as Pkg[]) || []));
  }, [open]);

  const pay = async (code: string, method: "cash_wallet" | "diamonds" | "credits") => {
    setBusy(code + method);
    const { data, error } = await supabase.rpc("live_promote", { _stream_id: streamId, _package_code: code, _method: method });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Your live is promoted until ${new Date(data as string).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Promote your live</DialogTitle>
          <DialogDescription>Get more viewers. Promoted lives show first on the Live page, and Featured lives appear at the front of the Shop.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {pkgs.map((p) => (
            <div key={p.code} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                </div>
                <Badge variant={p.placement === "shop_front" ? "default" : "secondary"}>{p.placement === "shop_front" ? "Shop front" : "Top of Live"}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.price_cash > 0 && (
                  <Button size="sm" disabled={!!busy} onClick={() => pay(p.code, "cash_wallet")}>
                    {busy === p.code + "cash_wallet" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}₱{Number(p.price_cash).toFixed(2)} Cash Wallet
                  </Button>
                )}
                {p.price_diamonds > 0 && (
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => pay(p.code, "diamonds")}>
                    {busy === p.code + "diamonds" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}💎 {p.price_diamonds} diamonds
                  </Button>
                )}
                {p.price_credits > 0 && (
                  <Button size="sm" variant="outline" disabled={!!busy} onClick={() => pay(p.code, "credits")}>
                    {busy === p.code + "credits" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{p.price_credits} credits
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!pkgs.length && <p className="text-sm text-muted-foreground">No promotions are available right now.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
