import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import ProviderChat from "@/components/chat/ProviderChat";
import { supabase } from "@/integrations/supabase/client";
import { formatDeliveryDate } from "@/lib/preferredDelivery";

export default function OrderDeliveryDetails({ orderId, orderNumber, date, sellerId }: { orderId: string; orderNumber: string; date?: string | null; sellerId?: string | null }) {
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let ids = sellerId ? [sellerId] : [];
      if (!sellerId) {
        const { data } = await supabase.from("order_items").select("products(seller_id)").eq("order_id", orderId);
        ids = [...new Set((data || []).flatMap(item => item.products?.seller_id ? [item.products.seller_id] : []))];
      }
      if (!ids.length) { if (!cancelled) setSellers([{ id: "admin", name: "Store Support" }]); return; }
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      if (!cancelled) setSellers(ids.map(id => ({ id, name: data?.find(p => p.id === id)?.full_name || "Seller" })));
    };
    void load();
    return () => { cancelled = true; };
  }, [orderId, sellerId]);
  const formatted = date ? formatDeliveryDate(date) : null;
  return <div className="space-y-2 text-sm">
    {formatted && <p className="flex items-start gap-2"><CalendarCheck className="h-4 w-4 shrink-0 mt-0.5 text-primary" /><span>Preferred delivery: <strong>{formatted}</strong><span className="block text-xs text-muted-foreground">Requested date · subject to seller confirmation</span></span></p>}
    <div className="flex flex-wrap gap-2">{sellers.map(seller => <ProviderChat key={seller.id} providerId={seller.id} providerName={seller.name} providerType="shop" referenceId={orderId} referenceTitle={`Order #${orderNumber}`} initialMessage={formatted ? `Hi, for order #${orderNumber}, my preferred delivery date is ${formatted}. Can you arrange shipping so the items arrive on that date? Please confirm availability.` : `Hi, I'd like to discuss the shipping schedule for order #${orderNumber}.`} />)}</div>
  </div>;
}