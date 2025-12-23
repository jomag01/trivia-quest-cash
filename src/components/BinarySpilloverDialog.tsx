import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowDownLeft, ArrowDownRight, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PendingPlacement {
  id: string;
  pending_user_id: string;
  purchase_id: string;
  created_at: string;
  pending_user?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

interface BinarySpilloverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingPlacement: PendingPlacement | null;
  onPlacementComplete: () => void;
}

export default function BinarySpilloverDialog({
  open,
  onOpenChange,
  pendingPlacement,
  onPlacementComplete,
}: BinarySpilloverDialogProps) {
  const [placing, setPlacing] = useState(false);
  const [selectedLeg, setSelectedLeg] = useState<"left" | "right" | null>(null);

  const handlePlacement = async () => {
    if (!pendingPlacement || !selectedLeg) return;

    setPlacing(true);
    try {
      const { data, error } = await supabase.rpc("place_pending_binary_user", {
        _pending_id: pendingPlacement.id,
        _chosen_leg: selectedLeg,
      });

      if (error) throw error;

      toast.success(
        `Successfully placed ${
          pendingPlacement.pending_user?.full_name || "member"
        } in your ${selectedLeg} leg!`
      );
      onPlacementComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error placing user:", error);
      toast.error(error.message || "Failed to place user");
    } finally {
      setPlacing(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (!pendingPlacement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Spillover Placement
          </DialogTitle>
          <DialogDescription>
            Your left and right legs are full. Choose which leg to place this
            referral in (they will be placed in the next available spot).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Pending User Info */}
          <div className="flex items-center gap-3 p-4 bg-accent/30 rounded-lg">
            <Avatar className="h-12 w-12">
              {pendingPlacement.pending_user?.avatar_url && (
                <AvatarImage src={pendingPlacement.pending_user.avatar_url} />
              )}
              <AvatarFallback className="bg-primary/20 text-primary">
                {getInitials(
                  pendingPlacement.pending_user?.full_name || null,
                  pendingPlacement.pending_user?.email || ""
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">
                {pendingPlacement.pending_user?.full_name ||
                  pendingPlacement.pending_user?.email?.split("@")[0] ||
                  "New Member"}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingPlacement.pending_user?.email}
              </p>
              <Badge variant="outline" className="mt-1 text-xs">
                Waiting for placement
              </Badge>
            </div>
          </div>

          {/* Leg Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Choose placement leg:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedLeg === "left" ? "default" : "outline"}
                className={`h-24 flex-col gap-2 ${
                  selectedLeg === "left"
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "hover:border-blue-500 hover:text-blue-500"
                }`}
                onClick={() => setSelectedLeg("left")}
              >
                <ArrowDownLeft className="w-8 h-8" />
                <span className="font-semibold">Left Leg</span>
              </Button>
              <Button
                variant={selectedLeg === "right" ? "default" : "outline"}
                className={`h-24 flex-col gap-2 ${
                  selectedLeg === "right"
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "hover:border-green-500 hover:text-green-500"
                }`}
                onClick={() => setSelectedLeg("right")}
              >
                <ArrowDownRight className="w-8 h-8" />
                <span className="font-semibold">Right Leg</span>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedLeg || placing}
              onClick={handlePlacement}
            >
              {placing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Placing...
                </>
              ) : (
                "Confirm Placement"
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            The member will be placed in the next available spot in your chosen
            leg's subtree.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
