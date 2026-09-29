import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Wallet, CreditCard, Minus, Plus, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  streamId: string;
  product: { id: string; name: string; final_price: number; image_url: string | null } | null;
}

/** One-screen checkout for live selling: Cash Wallet (instant) or GCash/card via PayMongo. */
export default function LiveCheckoutDialog({ open, onOpenChange, streamId, product }: Props) {
  const { user } = useAuth();
  const [qty, setQty] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState<null | "wallet" | "online" | "cod">(null);
  const [mode, setMode] = useState<"both" | "cod" | "ewallet">("both");

  useEffect(() => {
    if (!open || !user) return;
    setQty(1);
    supabase.from("cash_wallets").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setBalance(Number(data?.balance || 0)));
    supabase.from("profiles").select("full_name, phone, address").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => {
        if (data?.full_name) setName((n) => n || data.full_name);
        if (data?.phone) setPhone((p) => p || data.phone);
        if (data?.address) setAddress((a) => a || data.address);
      });
  }, [open, user]);

  useEffect(() => {
    if (!open || !product) return;
    supabase.from("live_stream_products").select("payment_mode").eq("stream_id", streamId).eq("product_id", product.id).maybeSingle()
      .then(({ data }: any) => setMode((data?.payment_mode as any) || "both"));
  }, [open, product, streamId]);

  if (!product) return null;
  const subtotal = (product.final_price || 0) * qty;
  const canWallet = balance >= subtotal;
  const allowCod = mode !== "ewallet";
  const allowEwallet = mode !== "cod";

  const createOrder = async (method: string) => {
    const { data, error } = await supabase.rpc("live_create_order" as any, {
      _product_id: product.id, _qty: qty, _stream_id: streamId,
      _name: name, _phone: phone, _address: address, _method: method,
    });
    if (error) throw error;
    return data as { order_id: string; total: number };
  };

  const pay = async (how: "wallet" | "online" | "cod") => {
    if (!user) return toast.error("Please sign in to buy");
    setBusy(how);
    try {
      const order = await createOrder(how === "wallet" ? "cash_wallet" : how === "cod" ? "cod" : "paymongo");
      if (how === "cod") {
        toast.success("Order placed! Pay cash when your item arrives.");
        onOpenChange(false);
      } else if (how === "wallet") {
        const { error } = await supabase.rpc("live_pay_with_wallet" as any, { _order_id: order.order_id });
        if (error) throw error;
        toast.success("Paid! Your order is confirmed.");
        onOpenChange(false);
      } else {
        const { data, error } = await supabase.functions.invoke("create-payment", {
          body: { amount: order.total, paymentMethod: "all", metadata: { purchase_type: "live_order", order_id: order.order_id } },
        });
        if (error || !data?.checkout_url) throw new Error(data?.error || "Could not start payment");
        window.open(data.checkout_url, "_blank");
        toast.info("Complete payment in the new tab. The live keeps playing here.");
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Buy now</DialogTitle></DialogHeader>
        <div className="flex gap-3 items-center">
          <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-16 h-16 rounded object-cover" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{product.name}</p>
            <p className="text-primary font-bold">₱{product.final_price?.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-3 w-3" /></Button>
            <span className="w-6 text-center text-sm">{qty}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(Math.min(50, qty + 1))}><Plus className="h-3 w-3" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
          <div><Label>Delivery address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Subtotal ₱{subtotal.toLocaleString()} + shipping (if any). Cash Wallet: ₱{balance.toLocaleString()}</p>
        <p className="text-xs font-medium">
          Seller accepts: {mode === "cod" ? "Cash on Delivery only" : mode === "ewallet" ? "E-wallet only" : "Cash on Delivery or E-wallet"}
        </p>
        <div className="grid gap-2">
          {allowCod && (
            <Button disabled={!!busy} onClick={() => pay("cod")}>
              {busy === "cod" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
              Cash on Delivery
            </Button>
          )}
          {allowEwallet && (
            <>
              <Button variant={allowCod ? "outline" : "default"} disabled={!canWallet || !!busy} onClick={() => pay("wallet")}>
                {busy === "wallet" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
                {canWallet ? "Pay with Cash Wallet" : "Not enough wallet balance"}
              </Button>
              <Button variant="outline" disabled={!!busy} onClick={() => pay("online")}>
                {busy === "online" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                GCash / Maya / Card
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
