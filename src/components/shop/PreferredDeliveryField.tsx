import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { estimatedDeliveryRange, formatDeliveryDate, minDeliveryDate, MIN_DELIVERY_ADVANCE_DAYS } from "@/lib/preferredDelivery";

export default function PreferredDeliveryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const estimate = value ? estimatedDeliveryRange(value) : null;
  return <div className="space-y-1 rounded-md border border-primary/40 bg-primary/5 p-3">
    <Label htmlFor="preferredDeliveryDate" className="font-medium">Preferred delivery date (optional)</Label>
    <Input id="preferredDeliveryDate" type="date" min={minDeliveryDate()} value={value} onChange={event => onChange(event.target.value)} aria-describedby="delivery-date-note" />
    {estimate ? (
      <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Truck className="h-3.5 w-3.5 shrink-0" />
        Estimated delivery: {formatDeliveryDate(estimate.earliest)} – {formatDeliveryDate(estimate.latest)}
      </p>
    ) : (
      <p className="text-xs text-muted-foreground">No date picked — the seller delivers on the courier's normal schedule, usually sooner.</p>
    )}
    <p id="delivery-date-note" className="text-xs text-muted-foreground">If you pick a date, it must be at least {MIN_DELIVERY_ADVANCE_DAYS} days ahead. Requested date, not guaranteed — subject to seller confirmation and courier availability.</p>
  </div>;
}
