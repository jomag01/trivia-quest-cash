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
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="w-5 h-5 text-amber-500 animate-pulse" />
            Pending Spillover Placements
            <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-600">
              {pendingPlacements.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These referrals need to be placed in your binary network. Choose which leg for each.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingPlacements.map((placement) => (
              <div
                key={placement.id}
                className="flex items-center gap-4 p-4 bg-background border rounded-lg hover:border-primary/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  {placement.pending_user?.avatar_url && (
                    <AvatarImage src={placement.pending_user.avatar_url} />
                  )}
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {getInitials(
                      placement.pending_user?.full_name || null,
                      placement.pending_user?.email || ""
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {placement.pending_user?.full_name ||
                      placement.pending_user?.email?.split("@")[0] ||
                      "New Member"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {placement.pending_user?.email}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {formatTimeAgo(placement.created_at)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600"
                    onClick={() => {
                      setSelectedPlacement(placement);
                      setDialogOpen(true);
                    }}
                  >
                    <ArrowDownLeft className="w-4 h-4 mr-1" />
                    Left
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => {
                      setSelectedPlacement(placement);
                      setDialogOpen(true);
                    }}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1" />
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
