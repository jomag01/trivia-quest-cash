import { Button } from "@/components/ui/button";
import type { BasketItem } from "./useLiveBasket";

/** TikTok-style pinned product popup shown to viewers. */
export default function PinnedProductCard({ item, onBuy, onView }: {
  item: BasketItem; onBuy: () => void; onView: () => void;
}) {
  return (
    <div className="absolute left-2 bottom-16 z-20 w-56 bg-background/95 rounded-xl p-2 flex gap-2 shadow-lg animate-in slide-in-from-left" onClick={onView}>
      <div className="relative">
        <img src={item.product.image_url || "/placeholder.svg"} alt={item.product.name} className="w-14 h-14 rounded object-cover" />
        <span className="absolute -top-1 -left-1 bg-primary text-primary-foreground text-[10px] font-bold rounded px-1">#{item.basket}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.product.name}</p>
        <p className="text-sm font-bold text-primary">₱{item.product.final_price?.toLocaleString()}</p>
        <Button size="sm" className="h-6 w-full text-[10px] mt-0.5" onClick={(e) => { e.stopPropagation(); onBuy(); }}>Buy now</Button>
      </div>
    </div>
  );
}
