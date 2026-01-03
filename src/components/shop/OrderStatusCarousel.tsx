import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Package, Truck, CheckCircle, Wallet } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";

type OrderTab = "all" | "to_pay" | "to_ship" | "to_receive" | "to_review" | "returns" | "cancelled";

type OrderLite = {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  tracking_number?: string | null;
};

function statusToTab(status: string): OrderTab {
  if (status === "pending_payment") return "to_pay";
  if (status === "pending" || status === "processing") return "to_ship";
  if (status === "shipped") return "to_receive";
  if (status === "delivered") return "to_review";
  if (status === "cancelled") return "cancelled";
  if (status === "returned" || status === "refunded") return "returns";
  return "all";
}

function statusMeta(status: string) {
  switch (status) {
    case "pending_payment":
      return { label: "To Pay", icon: Wallet };
    case "pending":
    case "processing":
      return { label: status === "pending" ? "Pending" : "Processing", icon: Package };
    case "shipped":
      return { label: "In Transit", icon: Truck };
    case "delivered":
      return { label: "Delivered", icon: CheckCircle };
    default:
      return { label: status, icon: Package };
  }
}

export function OrderStatusCarousel({
  orders,
  onSelectTab,
}: {
  orders: OrderLite[];
  onSelectTab: (tab: OrderTab) => void;
}) {
  const items = useMemo(() => {
    const sorted = [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    // Prefer active/interesting statuses first
    const priority = new Map<string, number>([
      ["shipped", 0],
      ["processing", 1],
      ["pending", 2],
      ["delivered", 3],
      ["pending_payment", 4],
    ]);
    sorted.sort((a, b) => (priority.get(a.status) ?? 99) - (priority.get(b.status) ?? 99));
    return sorted.slice(0, 6);
  }, [orders]);

  if (items.length === 0) return null;

  return (
    <div className="-mx-4 px-4">
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((o) => {
          const meta = statusMeta(o.status);
          const Icon = meta.icon;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelectTab(statusToTab(o.status))}
              className="text-left flex-shrink-0 w-[260px]"
            >
              <Card className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{meta.label}</p>
                      <p className="text-xs text-muted-foreground truncate">Order #{o.order_number}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {format(new Date(o.created_at), "MMM d")}
                  </Badge>
                </div>

                {o.status === "shipped" && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                    {o.tracking_number ? `Tracking: ${o.tracking_number}` : "Package is on the way"}
                  </p>
                )}
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
