import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Wallet, 
  ArrowDownUp,
  Building2,
  AlertTriangle,
  Search
} from "lucide-react";

const RiderPayoutManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTurnover, setSelectedTurnover] = useState<any>(null);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [actualAmount, setActualAmount] = useState("");
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch pending turnovers
  const { data: turnovers, isLoading: loadingTurnovers } = useQuery({
    queryKey: ["admin-rider-turnovers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_rider_turnovers" as any)
        .select(`
          *,
          rider:courier_riders(rider_code, vehicle_plate, hub_id),
          hub:courier_hubs(hub_name, hub_code)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch payout requests
  const { data: payouts, isLoading: loadingPayouts } = useQuery({
    queryKey: ["admin-rider-payouts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_rider_payouts" as any)
        .select(`
          *,
          rider:courier_riders(rider_code, vehicle_plate)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch rider balances
  const { data: riderBalances } = useQuery({
    queryKey: ["admin-rider-balances"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_riders" as any)
        .select("id, rider_code, current_cash_on_hand, total_deliveries, rating")
        .gt("current_cash_on_hand", 0)
        .order("current_cash_on_hand", { ascending: false });
      return data || [];
    },
  });

  const approveTurnoverMutation = useMutation({
    mutationFn: async ({ turnoverId, actualAmount, discrepancyReason }: any) => {
      const { error } = await supabase
        .from("courier_rider_turnovers" as any)
        .update({
          actual_amount: actualAmount,
          discrepancy: actualAmount - selectedTurnover.expected_amount,
          discrepancy_reason: discrepancyReason || null,
          status: "completed",
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", turnoverId);
      
      if (error) throw error;

      // Update rider's cash on hand
      await supabase
        .from("courier_riders" as any)
        .update({
          current_cash_on_hand: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTurnover.rider_id);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Turnover approved" });
      setSelectedTurnover(null);
      setActualAmount("");
      setDiscrepancyReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-rider-turnovers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-rider-balances"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectTurnoverMutation = useMutation({
    mutationFn: async ({ turnoverId, reason }: any) => {
      const { error } = await supabase
        .from("courier_rider_turnovers" as any)
        .update({
          status: "rejected",
          discrepancy_reason: reason,
          verified_by: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", turnoverId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Turnover rejected" });
      setSelectedTurnover(null);
      setDiscrepancyReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-rider-turnovers"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approvePayoutMutation = useMutation({
    mutationFn: async ({ payoutId, notes }: any) => {
      const { error } = await supabase
        .from("courier_rider_payouts" as any)
        .update({
          status: "completed",
          admin_notes: notes || null,
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payout approved" });
      setSelectedPayout(null);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-rider-payouts"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectPayoutMutation = useMutation({
    mutationFn: async ({ payoutId, reason }: any) => {
      const { error } = await supabase
        .from("courier_rider_payouts" as any)
        .update({
          status: "rejected",
          admin_notes: reason,
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Payout rejected" });
      setSelectedPayout(null);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-rider-payouts"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingTurnovers = turnovers?.filter((t: any) => t.status === "pending") || [];
  const completedTurnovers = turnovers?.filter((t: any) => t.status !== "pending") || [];
  const pendingPayouts = payouts?.filter((p: any) => p.status === "pending") || [];
  const processedPayouts = payouts?.filter((p: any) => p.status !== "pending") || [];

  const totalPendingCash = riderBalances?.reduce((sum: number, r: any) => sum + (r.current_cash_on_hand || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Turnovers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingTurnovers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Pending Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingPayouts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Cash with Riders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₱{totalPendingCash.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Riders with COD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{riderBalances?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="turnovers">
        <TabsList>
          <TabsTrigger value="turnovers">
            COD Turnovers ({pendingTurnovers.length} pending)
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Rider Payouts ({pendingPayouts.length} pending)
          </TabsTrigger>
          <TabsTrigger value="balances">
            Rider Balances
          </TabsTrigger>
        </TabsList>

        {/* Turnovers Tab */}
        <TabsContent value="turnovers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending COD Turnovers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTurnovers ? (
                <p className="text-center py-4">Loading...</p>
              ) : pendingTurnovers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending turnovers</p>
              ) : (
                <div className="space-y-3">
                  {pendingTurnovers.map((turnover: any) => (
                    <div key={turnover.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{turnover.rider?.rider_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {turnover.hub?.hub_name} • {new Date(turnover.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">₱{turnover.expected_amount?.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{turnover.shipment_count} parcels</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTurnover(turnover);
                            setActualAmount(turnover.expected_amount?.toString() || "");
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Process
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownUp className="h-5 w-5" />
                Completed Turnovers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedTurnovers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No completed turnovers</p>
              ) : (
                <div className="space-y-2">
                  {completedTurnovers.slice(0, 10).map((turnover: any) => (
                    <div key={turnover.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{turnover.rider?.rider_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(turnover.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">₱{(turnover.actual_amount || turnover.expected_amount)?.toLocaleString()}</span>
                        <Badge variant={turnover.status === "completed" ? "default" : "destructive"}>
                          {turnover.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Pending Payout Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPayouts ? (
                <p className="text-center py-4">Loading...</p>
              ) : pendingPayouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending payout requests</p>
              ) : (
                <div className="space-y-3">
                  {pendingPayouts.map((payout: any) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{payout.rider?.rider_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {payout.bank} • {payout.account_name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {payout.account_number}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">₱{payout.amount?.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payout.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSelectedPayout(payout)}
                        >
                          Process
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Processed Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              {processedPayouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No processed payouts</p>
              ) : (
                <div className="space-y-2">
                  {processedPayouts.slice(0, 10).map((payout: any) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{payout.rider?.rider_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {payout.bank} • {new Date(payout.processed_at || payout.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">₱{payout.amount?.toLocaleString()}</span>
                        <Badge variant={payout.status === "completed" ? "default" : "destructive"}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Riders with Pending COD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search rider..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {riderBalances?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No riders with pending COD</p>
              ) : (
                <div className="space-y-2">
                  {riderBalances
                    ?.filter((r: any) => 
                      r.rider_code?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((rider: any) => (
                      <div key={rider.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{rider.rider_code}</p>
                            <p className="text-xs text-muted-foreground">
                              {rider.total_deliveries} deliveries • ⭐ {rider.rating?.toFixed(1) || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-yellow-600">
                            ₱{rider.current_cash_on_hand?.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">pending turnover</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Turnover Approval Dialog */}
      <Dialog open={!!selectedTurnover} onOpenChange={(open) => !open && setSelectedTurnover(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process COD Turnover</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Rider:</span>
                <span className="font-medium">{selectedTurnover?.rider?.rider_code}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Expected Amount:</span>
                <span className="font-medium">₱{selectedTurnover?.expected_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parcels:</span>
                <span className="font-medium">{selectedTurnover?.shipment_count}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Actual Amount Received (₱)</Label>
              <Input
                type="number"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="Enter actual amount"
              />
            </div>

            {parseFloat(actualAmount) !== selectedTurnover?.expected_amount && actualAmount && (
              <div className="space-y-2">
                <Label>Discrepancy Reason</Label>
                <Textarea
                  value={discrepancyReason}
                  onChange={(e) => setDiscrepancyReason(e.target.value)}
                  placeholder="Explain the discrepancy..."
                />
                <p className="text-sm text-yellow-600">
                  Discrepancy: ₱{(parseFloat(actualAmount) - (selectedTurnover?.expected_amount || 0)).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => rejectTurnoverMutation.mutate({
                  turnoverId: selectedTurnover?.id,
                  reason: discrepancyReason || "Rejected by admin",
                })}
                disabled={rejectTurnoverMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                className="flex-1"
                onClick={() => approveTurnoverMutation.mutate({
                  turnoverId: selectedTurnover?.id,
                  actualAmount: parseFloat(actualAmount),
                  discrepancyReason,
                })}
                disabled={!actualAmount || approveTurnoverMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payout Approval Dialog */}
      <Dialog open={!!selectedPayout} onOpenChange={(open) => !open && setSelectedPayout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rider:</span>
                <span className="font-medium">{selectedPayout?.rider?.rider_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-lg">₱{selectedPayout?.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bank:</span>
                <span className="font-medium">{selectedPayout?.bank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Name:</span>
                <span className="font-medium">{selectedPayout?.account_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-mono">{selectedPayout?.account_number}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Admin Notes (Optional)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Reference number or notes..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => rejectPayoutMutation.mutate({
                  payoutId: selectedPayout?.id,
                  reason: adminNotes || "Rejected by admin",
                })}
                disabled={rejectPayoutMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                className="flex-1"
                onClick={() => approvePayoutMutation.mutate({
                  payoutId: selectedPayout?.id,
                  notes: adminNotes,
                })}
                disabled={approvePayoutMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark as Paid
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RiderPayoutManagement;