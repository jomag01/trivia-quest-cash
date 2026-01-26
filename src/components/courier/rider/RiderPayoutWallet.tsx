import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, 
  ArrowUpRight, 
  History, 
  AlertCircle, 
  Banknote,
  Building2,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";

const BANKS = [
  "GCash",
  "Maya",
  "BDO",
  "BPI",
  "Metrobank",
  "UnionBank",
  "Landbank",
  "PNB",
  "Security Bank",
  "GoTyme Bank",
  "CIMB Bank",
  "Chinabank",
  "EastWest Bank",
  "RCBC",
];

const RiderPayoutWallet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTurnoverOpen, setIsTurnoverOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutData, setPayoutData] = useState({
    bank: "",
    account_name: "",
    account_number: "",
    amount: "",
  });

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["rider-payout-wallet"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data: rider } = await supabase
        .from("courier_riders" as any)
        .select("id, rider_code, current_cash_on_hand, hub_id")
        .eq("user_id", session.session.user.id)
        .single();

      if (!rider) return null;

      // Get pending COD collections
      const { data: pendingCOD } = await supabase
        .from("courier_cod_transactions" as any)
        .select("amount")
        .eq("rider_id", (rider as any).id)
        .in("status", ["collected", "pending_turnover"]);

      // Get pending turnovers
      const { data: pendingTurnovers } = await supabase
        .from("courier_rider_turnovers" as any)
        .select("expected_amount, status")
        .eq("rider_id", (rider as any).id)
        .eq("status", "pending");

      // Get recent turnovers
      const { data: recentTurnovers } = await supabase
        .from("courier_rider_turnovers" as any)
        .select("*")
        .eq("rider_id", (rider as any).id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Get payout requests
      const { data: payoutRequests } = await supabase
        .from("courier_rider_payouts" as any)
        .select("*")
        .eq("rider_id", (rider as any).id)
        .order("created_at", { ascending: false })
        .limit(10);

      const riderData = rider as any;
      const pendingCODTotal = (pendingCOD as any[])?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
      const pendingTurnoverTotal = (pendingTurnovers as any[])?.reduce((sum: number, t: any) => sum + (t.expected_amount || 0), 0) || 0;

      return {
        rider: riderData,
        pendingCODTotal,
        pendingTurnoverTotal,
        cashOnHand: riderData.current_cash_on_hand || 0,
        recentTurnovers: recentTurnovers || [],
        payoutRequests: payoutRequests || [],
      };
    },
  });

  const turnoverMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("courier-rider", {
        body: { action: "submit-turnover" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "COD turnover submitted for approval" });
      setIsTurnoverOpen(false);
      queryClient.invalidateQueries({ queryKey: ["rider-payout-wallet"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const payoutMutation = useMutation({
    mutationFn: async (data: typeof payoutData) => {
      const { data: result, error } = await supabase.functions.invoke("courier-rider", {
        body: { 
          action: "request-payout",
          bank: data.bank,
          account_name: data.account_name,
          account_number: data.account_number,
          amount: parseFloat(data.amount),
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Payout request submitted" });
      setIsPayoutOpen(false);
      setPayoutData({ bank: "", account_name: "", account_number: "", amount: "" });
      queryClient.invalidateQueries({ queryKey: ["rider-payout-wallet"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handlePayoutSubmit = () => {
    if (!payoutData.bank || !payoutData.account_name || !payoutData.account_number || !payoutData.amount) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    const amount = parseFloat(payoutData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Invalid amount", variant: "destructive" });
      return;
    }
    payoutMutation.mutate(payoutData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!walletData?.rider) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>You are not registered as a rider</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cash On Hand Summary */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            Cash On Hand (COD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold">
                ₱{(walletData?.cashOnHand || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Must be turned over to hub</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground">Pending COD</p>
                <p className="font-semibold">₱{(walletData?.pendingCODTotal || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground">For Approval</p>
                <p className="font-semibold">₱{(walletData?.pendingTurnoverTotal || 0).toLocaleString()}</p>
              </div>
            </div>

            {(walletData?.cashOnHand || 0) > 0 && (
              <Dialog open={isTurnoverOpen} onOpenChange={setIsTurnoverOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Submit Turnover to Hub
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>COD Turnover</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Amount to turnover</p>
                      <p className="text-2xl font-bold">
                        ₱{(walletData?.cashOnHand || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Please hand over the exact cash amount to the hub cashier before confirming. The cashier will verify and approve your turnover.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => turnoverMutation.mutate()}
                      disabled={turnoverMutation.isPending}
                    >
                      {turnoverMutation.isPending ? "Processing..." : "Confirm Turnover Submission"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Payout Card - For rider earnings/incentives */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-5 w-5" />
            Rider Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Request payout for your delivery incentives and bonuses
            </p>
            <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Building2 className="h-4 w-4 mr-2" />
                  Request Payout
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bank / E-Wallet</Label>
                    <Select
                      value={payoutData.bank}
                      onValueChange={(value) => setPayoutData({ ...payoutData, bank: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        {BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="Full name as registered"
                      value={payoutData.account_name}
                      onChange={(e) => setPayoutData({ ...payoutData, account_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input
                      placeholder="Account number"
                      value={payoutData.account_number}
                      onChange={(e) => setPayoutData({ ...payoutData, account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₱)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={payoutData.amount}
                      onChange={(e) => setPayoutData({ ...payoutData, amount: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handlePayoutSubmit}
                    disabled={payoutMutation.isPending}
                  >
                    {payoutMutation.isPending ? "Submitting..." : "Submit Payout Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="turnovers">
            <TabsList className="w-full">
              <TabsTrigger value="turnovers" className="flex-1">Turnovers</TabsTrigger>
              <TabsTrigger value="payouts" className="flex-1">Payouts</TabsTrigger>
            </TabsList>
            <TabsContent value="turnovers" className="mt-4">
              {walletData?.recentTurnovers?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No turnovers yet</p>
              ) : (
                <div className="space-y-2">
                  {walletData?.recentTurnovers?.map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-mono text-sm">
                          {new Date(tx.turnover_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tx.shipment_count} parcels
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{(tx.actual_amount || tx.expected_amount)?.toLocaleString()}</p>
                        <Badge 
                          variant={tx.status === "completed" ? "default" : tx.status === "pending" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {tx.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {tx.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="payouts" className="mt-4">
              {walletData?.payoutRequests?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No payout requests yet</p>
              ) : (
                <div className="space-y-2">
                  {walletData?.payoutRequests?.map((payout: any) => (
                    <div key={payout.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{payout.bank}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{payout.amount?.toLocaleString()}</p>
                        <Badge 
                          variant={payout.status === "completed" ? "default" : payout.status === "pending" ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {payout.status === "completed" && <CheckCircle className="h-3 w-3 mr-1" />}
                          {payout.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {payout.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderPayoutWallet;