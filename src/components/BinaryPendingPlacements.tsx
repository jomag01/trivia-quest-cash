import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Clock, ArrowDownLeft, ArrowDownRight, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BinarySpilloverDialog from "./BinarySpilloverDialog";

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

interface BinaryPendingPlacementsProps {
  userId: string;
  onPlacementComplete?: () => void;
}

export default function BinaryPendingPlacements({
  userId,
  onPlacementComplete,
}: BinaryPendingPlacementsProps) {
  const [loading, setLoading] = useState(true);
  const [pendingPlacements, setPendingPlacements] = useState<PendingPlacement[]>([]);
  const [selectedPlacement, setSelectedPlacement] = useState<PendingPlacement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPendingPlacements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("binary_pending_placements")
        .select("id, pending_user_id, purchase_id, created_at")
        .eq("sponsor_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch user profiles for each pending placement
      const placementsWithProfiles: PendingPlacement[] = await Promise.all(
        (data || []).map(async (placement) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email, avatar_url")
            .eq("id", placement.pending_user_id)
            .single();

          return {
            ...placement,
            pending_user: profile || undefined,
          };
        })
      );

      setPendingPlacements(placementsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching pending placements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPlacements();
  }, [userId]);

  const handlePlacementClick = (placement: PendingPlacement) => {
    setSelectedPlacement(placement);
    setDialogOpen(true);
  };

  const handlePlacementComplete = () => {
    fetchPendingPlacements();
    onPlacementComplete?.();
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  };

  if (loading) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <Skeleton className="h-5 sm:h-6 w-40 sm:w-48" />
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            <Skeleton className="h-14 sm:h-16 w-full" />
            <Skeleton className="h-14 sm:h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingPlacements.length === 0) {
    return null; // Don't show anything if no pending placements
  }

  return (
    <>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 animate-pulse" />
            <span className="truncate">Pending Spillover</span>
            <Badge variant="secondary" className="ml-1 sm:ml-2 bg-amber-500/20 text-amber-600 text-xs">
              {pendingPlacements.length}
            </Badge>
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Choose which leg for each referral
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="space-y-2 sm:space-y-3">
            {pendingPlacements.map((placement) => (
              <div
                key={placement.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-background border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 min-w-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                    {placement.pending_user?.avatar_url && (
                      <AvatarImage src={placement.pending_user.avatar_url} />
                    )}
                    <AvatarFallback className="bg-primary/20 text-primary text-xs sm:text-sm">
                      {getInitials(
                        placement.pending_user?.full_name || null,
                        placement.pending_user?.email || ""
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">
                      {placement.pending_user?.full_name ||
                        placement.pending_user?.email?.split("@")[0] ||
                        "New Member"}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {placement.pending_user?.email}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {formatTimeAgo(placement.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-initial bg-blue-500 hover:bg-blue-600 text-xs sm:text-sm h-8 sm:h-9"
                    onClick={() => {
                      setSelectedPlacement(placement);
                      setDialogOpen(true);
                    }}
                  >
                    <ArrowDownLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Left
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-initial bg-green-500 hover:bg-green-600 text-xs sm:text-sm h-8 sm:h-9"
                    onClick={() => {
                      setSelectedPlacement(placement);
                      setDialogOpen(true);
                    }}
                  >
                    <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Right
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <BinarySpilloverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pendingPlacement={selectedPlacement}
        onPlacementComplete={handlePlacementComplete}
      />
    </>
  );
}
