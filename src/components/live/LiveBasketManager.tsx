import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Pin, PinOff, Plus, Trash2, ShoppingBag, X, Check, Loader2 } from "lucide-react";
import { useLiveBasket } from "./useLiveBasket";

/** Seller-side basket control during a live: one-tap add, set basket #, pin one. */
export default function LiveBasketManager({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { items, reload } = useLiveBasket(streamId);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Load the seller's catalog as soon as the panel opens — no extra tap needed.
  useEffect(() => {
    if (!adding || !user) return;
    supabase.from("products").select("id, name, final_price, image_url, seller_id")
      .eq("is_active", true).ilike("name", `%${search}%`)
      .order("seller_id", { ascending: true }).limit(40)
      .then(({ data }) => setCatalog(data || []));
  }, [adding, search, user]);

  const pin = async (rowId: string, on: boolean) => {
    const { error } = await supabase.from("live_stream_products")
      .update({ pinned_at: on ? new Date().toISOString() : null, is_featured: on }).eq("id", rowId);
    if (error) return toast.error(error.message);
    if (on) await supabase.from("live_stream_products").update({ pinned_at: null, is_featured: false })
      .eq("stream_id", streamId).neq("id", rowId);
    toast.success(on ? "Pinned for viewers" : "Unpinned");
    reload();
  };

  const setNumber = async (rowId: string, n: number) => {
    if (!n || n < 1) return;
    await supabase.from("live_stream_products").update({ basket_number: n }).eq("id", rowId);
  };

  const remove = async (rowId: string) => {
    await supabase.from("live_stream_products").delete().eq("id", rowId);
    reload();
  };

  // One tap on a product card adds it to the basket immediately.
  const add = async (productId: string) => {
    if (pendingId) return;
    if (items.some((i) => i.product.id === productId)) return toast.info("Already in basket");
    setPendingId(productId);
    const next = Math.max(0, ...items.map((i) => i.basket)) + 1;
    const { error } = await supabase.from("live_stream_products").insert({
      stream_id: streamId, product_id: productId, display_order: next - 1, basket_number: next, streamer_id: user?.id,
    });
    setPendingId(null);
    if (error) return toast.error(error.message);
    toast.success(`Added as basket #${next}`);
    reload();
  };

  return (
    <div className="absolute inset-x-2 bottom-2 top-1/3 z-40 bg-background/95 backdrop-blur rounded-xl flex flex-col border">
      <div className="flex items-center justify-between p-3 border-b">
        <p className="font-semibold flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Live Basket ({items.length})</p>
        <div className="flex gap-1">
          <Button size="sm" variant={adding ? "secondary" : "default"} onClick={() => setAdding(!adding)}>
            <Plus className="w-4 h-4 mr-1" />{adding ? "Done" : "Add"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        {adding ? (
          <div className="space-y-2">
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">Tap a product to add it instantly.</p>
            {catalog.map((p) => {
              const inBasket = items.some((i) => i.product.id === p.id);
              const basketNo = items.find((i) => i.product.id === p.id)?.basket;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={inBasket || pendingId === p.id}
                  onClick={() => add(p.id)}
                  className={`w-full flex items-center gap-2 p-1.5 rounded border text-left transition-colors ${
                    inBasket ? "opacity-60 bg-muted" : "hover:bg-accent active:bg-accent"
                  }`}
                >
                  <img src={p.image_url || "/placeholder.svg"} className="w-10 h-10 rounded object-cover" alt={p.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    <p className="text-xs text-primary font-bold">₱{p.final_price?.toLocaleString()}</p>
                  </div>
                  {pendingId === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : inBasket ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                      <Check className="w-4 h-4" /> #{basketNo}
                    </span>
                  ) : (
                    <Plus className="w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No products yet — tap Add.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.rowId} className={`flex items-center gap-2 p-1.5 rounded border ${it.pinned ? "ring-2 ring-primary" : ""}`}>
                <Input type="number" min={1} defaultValue={it.basket} className="w-14 h-8 text-center font-bold"
                  onBlur={(e) => setNumber(it.rowId, parseInt(e.target.value))} aria-label="Basket number" />
                <img src={it.product.image_url || "/placeholder.svg"} className="w-10 h-10 rounded object-cover" alt={it.product.name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{it.product.name}</p>
                  <p className="text-xs text-primary font-bold">₱{it.product.final_price?.toLocaleString()}</p>
                </div>
                <Button size="icon" variant={it.pinned ? "default" : "outline"} className="h-8 w-8"
                  onClick={() => pin(it.rowId, !it.pinned)} aria-label="Pin">
                  {it.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(it.rowId)} aria-label="Remove">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
