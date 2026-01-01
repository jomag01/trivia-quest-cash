import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle, XCircle, Eye, Bike, User, RefreshCw, Bell, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface RiderApplication {
  id: string;
  user_id: string;
  status: string;
  vehicle_type: string | null;
  license_number: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  total_deliveries: number;
  rating: number;
  admin_notes: string | null;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export const RiderManagement = () => {
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewRider, setViewRider] = useState<RiderApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: riders, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-riders", activeTab],
    queryFn: async () => {
      let query = (supabase as any)
        .from("delivery_riders")
        .select(`*, profiles(full_name, email)`)
        .order("created_at", { ascending: false });

      if (activeTab !== "all") {
        query = query.eq("status", activeTab);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Admin riders query error:", error);
        throw error;
      }
      console.log("Riders loaded:", data?.length, data);
      return data as RiderApplication[];
    },
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel("admin-riders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delivery_riders",
        },
        (payload) => {
          console.log("Rider update received:", payload);
          queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
          
          if (payload.eventType === "INSERT") {
            toast.info("New rider application received!", {
              icon: <Bell className="w-4 h-4" />,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("delivery_riders")
        .update({
          status: "approved",
          admin_notes: adminNotes || null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // Update profile
      await supabase
        .from("profiles")
        .update({ is_verified_rider: true } as any)
        .eq("id", userId);
        
      // Create notification for rider
      await (supabase as any).from("notifications").insert({
        user_id: userId,
        title: "Application Approved! 🎉",
        message: "Your rider application has been approved. You can now start accepting deliveries!",
        type: "rider_approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast.success("Rider approved!");
      setViewRider(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("delivery_riders")
        .update({
          status: "rejected",
          admin_notes: adminNotes || null,
        })
        .eq("id", id);
      if (error) throw error;
      
      // Create notification for rider
      await (supabase as any).from("notifications").insert({
        user_id: userId,
        title: "Application Update",
        message: adminNotes || "Your rider application was not approved at this time. Please contact support for more information.",
        type: "rider_rejected",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast.success("Rider rejected");
      setViewRider(null);
      setAdminNotes("");
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await (supabase as any)
        .from("delivery_riders")
        .update({ status: "suspended", admin_notes: adminNotes || null })
        .eq("id", id);
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ is_verified_rider: false } as any)
        .eq("id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-riders"] });
      toast.success("Rider suspended");
      setViewRider(null);
    },
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRiders = riders?.filter((r) => {
    if (!normalizedQuery) return true;

    const fullName = (r.profiles?.full_name ?? "").toLowerCase();
    const email = (r.profiles?.email ?? "").toLowerCase();
    const vehicle = (r.vehicle_type ?? "").toLowerCase();
    const license = (r.license_number ?? "").toLowerCase();

    return (
      fullName.includes(normalizedQuery) ||
      email.includes(normalizedQuery) ||
      vehicle.includes(normalizedQuery) ||
      license.includes(normalizedQuery)
    );
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    suspended: "bg-gray-500",
  };

  const pendingCount = riders?.filter(r => r.status === "pending").length || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bike className="w-4 h-4" /> Rider Management
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="h-7 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
        {/* Debug info */}
        {!isAdmin && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-destructive text-xs mt-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Not recognized as admin. Try logging out and back in.</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded text-destructive text-xs mt-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Error: {(error as any)?.message || "Failed to load riders"}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="pending" className="text-[10px]">
              Pending {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
            <TabsTrigger value="approved" className="text-[10px]">Approved</TabsTrigger>
            <TabsTrigger value="rejected" className="text-[10px]">Rejected</TabsTrigger>
            <TabsTrigger value="all" className="text-[10px]">All</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-2 space-y-2 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded" />
                ))}
              </div>
            ) : filteredRiders?.length === 0 ? (
              <div className="text-center py-8">
                <Bike className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No riders found</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {activeTab === "pending" 
                    ? "No pending applications" 
                    : `No ${activeTab} riders`}
                </p>
              </div>
            ) : (
              filteredRiders?.map((rider) => (
                <Card key={rider.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setViewRider(rider)}>
                  <CardContent className="p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{rider.profiles?.full_name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {rider.vehicle_type} • {new Date(rider.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColors[rider.status]} text-[10px]`}>{rider.status}</Badge>
                      <Eye className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* View Rider Dialog */}
      <Dialog open={!!viewRider} onOpenChange={() => setViewRider(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Rider Application</DialogTitle>
          </DialogHeader>
          {viewRider && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{viewRider.profiles?.full_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium truncate">{viewRider.profiles?.email || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vehicle:</span>
                  <p className="font-medium">{viewRider.vehicle_type || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">License:</span>
                  <p className="font-medium">{viewRider.license_number || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Deliveries:</span>
                  <p className="font-medium">{viewRider.total_deliveries}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Rating:</span>
                  <p className="font-medium">{viewRider.rating}/5</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Applied:</span>
                  <p className="font-medium">{new Date(viewRider.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`${statusColors[viewRider.status]} text-[10px]`}>{viewRider.status}</Badge>
                </div>
              </div>

              {/* ID Images */}
              <div className="grid grid-cols-3 gap-2">
                {viewRider.id_front_url ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">ID Front</p>
                    <img src={viewRider.id_front_url} alt="ID Front" className="w-full h-20 object-cover rounded border" />
                  </div>
                ) : (
                  <div className="h-20 bg-muted rounded flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground">Uploading...</p>
                  </div>
                )}
                {viewRider.id_back_url ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">ID Back</p>
                    <img src={viewRider.id_back_url} alt="ID Back" className="w-full h-20 object-cover rounded border" />
                  </div>
                ) : (
                  <div className="h-20 bg-muted rounded flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground">Uploading...</p>
                  </div>
                )}
                {viewRider.selfie_url ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Selfie</p>
                    <img src={viewRider.selfie_url} alt="Selfie" className="w-full h-20 object-cover rounded border" />
                  </div>
                ) : (
                  <div className="h-20 bg-muted rounded flex items-center justify-center">
                    <p className="text-[10px] text-muted-foreground">Uploading...</p>
                  </div>
                )}
              </div>

              {viewRider.admin_notes && (
                <div className="p-2 bg-muted rounded text-xs">
                  <span className="text-muted-foreground">Previous Notes:</span>
                  <p>{viewRider.admin_notes}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Admin Notes</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes (optional)..."
                  className="text-xs min-h-[60px]"
                />
              </div>

              {viewRider.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => rejectMutation.mutate({ id: viewRider.id, userId: viewRider.user_id })}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => approveMutation.mutate({ id: viewRider.id, userId: viewRider.user_id })}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                </div>
              )}

              {viewRider.status === "approved" && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={() => suspendMutation.mutate({ id: viewRider.id, userId: viewRider.user_id })}
                  disabled={suspendMutation.isPending}
                >
                  Suspend Rider
                </Button>
              )}

              {viewRider.status === "rejected" && (
                <Button
                  size="sm"
                  className="w-full text-xs h-8"
                  onClick={() => approveMutation.mutate({ id: viewRider.id, userId: viewRider.user_id })}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve Anyway
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};