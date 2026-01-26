import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const CODDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["cod-dashboard-stats"],
    queryFn: async () => {
      const [pendingCollection, collectedToday, creditedToday, pendingTurnover] = await Promise.all([
        supabase
          .from("courier_cod_transactions")
          .select("amount")
          .eq("status", "pending"),
        supabase
          .from("courier_cod_transactions")
          .select("amount")
          .eq("status", "collected")
          .gte("created_at", new Date().toISOString().split('T')[0]),
        supabase
          .from("courier_cod_transactions")
          .select("amount")
          .eq("status", "credited")
          .gte("created_at", new Date().toISOString().split('T')[0]),
        supabase
          .from("courier_rider_turnovers")
          .select("amount")
          .eq("status", "pending"),
      ]);

      return {
        pendingCollection: pendingCollection.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        collectedToday: collectedToday.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        creditedToday: creditedToday.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
        pendingTurnover: pendingTurnover.data?.reduce((sum, t) => sum + ((t as any).amount || 0), 0) || 0,
      };
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ["recent-cod-transactions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_cod_transactions")
        .select(`
          *,
          shipment:courier_shipments(tracking_number, recipient_name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats?.pendingCollection.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Collected Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats?.collectedToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From riders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credited Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats?.creditedToday.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">To seller wallets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Turnover</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats?.pendingTurnover.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From riders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent COD Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTransactions?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transactions</p>
            ) : (
              recentTransactions?.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-mono text-sm">{tx.shipment?.tracking_number}</p>
                    <p className="text-xs text-muted-foreground">{tx.shipment?.recipient_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">₱{tx.amount?.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      tx.status === 'credited' ? 'bg-green-100 text-green-800' :
                      tx.status === 'collected' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CODDashboard;
