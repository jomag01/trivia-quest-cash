import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, ArrowUpRight, History, AlertCircle } from "lucide-react";
import { useState } from "react";

const RiderCODWallet = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTurnoverOpen, setIsTurnoverOpen] = useState(false);

  const { data: walletData, isLoading } = useQuery({
    queryKey: ["rider-cod-wallet"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;

      const { data: rider } = await supabase
        .from("courier_riders" as any)
        .select("id, current_cash_on_hand")
        .eq("user_id", session.session.user.id)
        .single();

      if (!rider) return null;

      const { data: pendingCOD } = await supabase
        .from("courier_cod_transactions" as any)
        .select("amount")
        .eq("rider_id", (rider as any).id)
        .eq("status", "collected");

      const { data: recentTransactions } = await supabase
        .from("courier_cod_transactions" as any)
        .select(`
          *,
          shipment:courier_shipments(tracking_number)
        `)
        .eq("rider_id", (rider as any).id)
        .order("created_at", { ascending: false })
        .limit(10);

      const pendingTotal = (pendingCOD as any[])?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

      return {
        rider,
        pendingTotal,
        recentTransactions: recentTransactions || [],
      };
    },
  });

  const turnoverMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("courier-rider", {
        body: { action: "turnover-cod" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "COD turnover submitted" });
      setIsTurnoverOpen(false);
      queryClient.invalidateQueries({ queryKey: ["rider-cod-wallet"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            COD Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-3xl font-bold">
                ₱{(walletData?.pendingTotal || 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Pending turnover</p>
            </div>

            {(walletData?.pendingTotal || 0) > 0 && (
              <Dialog open={isTurnoverOpen} onOpenChange={setIsTurnoverOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Turnover to Hub
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
                        ₱{(walletData?.pendingTotal || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-700 dark:text-yellow-400">
                        Please hand over the exact amount to the hub cashier before confirming.
                      </p>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => turnoverMutation.mutate()}
                      disabled={turnoverMutation.isPending}
                    >
                      {turnoverMutation.isPending ? "Processing..." : "Confirm Turnover"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {walletData?.recentTransactions?.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {walletData?.recentTransactions?.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm">{tx.shipment?.tracking_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.transaction_type === 'collection' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.transaction_type === 'collection' ? '+' : '-'}₱{tx.amount?.toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderCODWallet;
