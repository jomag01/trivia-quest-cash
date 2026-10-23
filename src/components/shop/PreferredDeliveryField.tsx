import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { manilaToday } from "@/lib/preferredDelivery";

export default function PreferredDeliveryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1">
    <Label htmlFor="preferredDeliveryDate">Preferred delivery date (optional)</Label>
    <Input id="preferredDeliveryDate" type="date" min={manilaToday()} value={value} onChange={event => onChange(event.target.value)} aria-describedby="delivery-date-note" />
    <p id="delivery-date-note" className="text-xs text-muted-foreground">Requested arrival date, not guaranteed. Subject to seller confirmation and courier availability.</p>
  </div>;
}