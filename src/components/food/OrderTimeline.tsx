import { Check, Clock, UtensilsCrossed, Bike, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderTimelineProps {
  status: string;
  timestamps?: {
    placed?: string;
    confirmed?: string;
    preparing?: string;
    ready?: string;
    picked_up?: string;
    delivered?: string;
  };
}

const STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: Check },
  { key: "preparing", label: "Preparing", icon: UtensilsCrossed },
  { key: "ready", label: "Ready", icon: Clock },
  { key: "assigned", label: "Driver Assigned", icon: Bike },
  { key: "picked_up", label: "Picked Up", icon: Bike },
  { key: "in_transit", label: "On the Way", icon: MapPin },
  { key: "delivered", label: "Delivered", icon: Check },
];

const STATUS_ORDER = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
];

export const OrderTimeline = ({ status, timestamps }: OrderTimelineProps) => {
  const currentIndex = STATUS_ORDER.indexOf(status);

  // Filter steps based on whether they've been reached or are current
  const visibleSteps = STEPS.filter((step) => {
    const stepIndex = STATUS_ORDER.indexOf(step.key);
    return stepIndex <= Math.max(currentIndex, 3); // Show at least up to "ready"
  });

  return (
    <div className="flex items-center justify-between w-full py-4">
      {visibleSteps.map((step, index) => {
        const stepIndex = STATUS_ORDER.indexOf(step.key);
        const isCompleted = stepIndex < currentIndex;
        const isCurrent = stepIndex === currentIndex;
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex flex-col items-center flex-1">
            <div className="relative flex items-center w-full">
              {/* Line before */}
              {index > 0 && (
                <div
                  className={cn(
                    "absolute left-0 right-1/2 h-0.5 -translate-y-1/2 top-4",
                    isCompleted || isCurrent ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              {/* Line after */}
              {index < visibleSteps.length - 1 && (
                <div
                  className={cn(
                    "absolute left-1/2 right-0 h-0.5 -translate-y-1/2 top-4",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                    ? "border-primary bg-background text-primary animate-pulse"
                    : "border-muted bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <span
              className={cn(
                "mt-2 text-[10px] text-center",
                isCurrent ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
