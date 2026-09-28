import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BasketItem {
  rowId: string;
  basket: number;
  pinned: boolean;
  product: { id: string; name: string; final_price: number; image_url: string | null; seller_id?: string | null };
}

/** Live basket for a stream: numbered items + pinned item, synced in realtime. */
export function useLiveBasket(streamId: string | undefined) {
  const [items, setItems] = useState<BasketItem[]>([]);

  const load = useCallback(async () => {
    if (!streamId) return;
    const { data: rows } = await supabase
      .from("live_stream_products")
      .select("id, product_id, display_order, basket_number, pinned_at")
      .eq("stream_id", streamId)
      .order("display_order");
    if (!rows?.length) return setItems([]);
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, final_price, image_url, seller_id")
      .in("id", rows.map((r) => r.product_id));
    const map = new Map((prods || []).map((p) => [p.id, p]));
    const latestPin = rows.reduce<string | null>(
      (acc, r) => (r.pinned_at && (!acc || r.pinned_at > acc) ? r.pinned_at : acc), null);
    setItems(
      rows
        .filter((r) => map.has(r.product_id))
        .map((r, i) => ({
          rowId: r.id,
          basket: r.basket_number ?? (r.display_order ?? i) + 1,
          pinned: !!latestPin && r.pinned_at === latestPin,
          product: map.get(r.product_id) as BasketItem["product"],
        }))
        .sort((a, b) => a.basket - b.basket)
    );
  }, [streamId]);

  useEffect(() => {
    if (!streamId) return;
    load();
    const ch = supabase
      .channel(`basket-${streamId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "live_stream_products", filter: `stream_id=eq.${streamId}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [streamId, load]);

  const pinned = items.find((i) => i.pinned) || null;
  return { items, pinned, reload: load };
}
