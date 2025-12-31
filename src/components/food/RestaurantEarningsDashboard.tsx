import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, DollarSign, Wallet, ArrowDownToLine, 
  FileText, Calendar, Building2 
} from "lucide-react";
import { format } from "date-fns";

interface WalletData {
  balance: number;
  total_earnings: number;
  total_commission_paid: number;
  pending_payout: number;
}

interface OrderCommission {
  id: string;
  gross_amount: number;
  commission_amount: number;
  vat_amount: number;
  net_payout: number;
  created_at: string;
  food_orders?: {
    order_number: string;
    status: string;
  };
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  scheduled_date: string;
  processed_at: string | null;
  created_at: string;
}

export const RestaurantEarningsDashboard = ({ restaurantId }: { restaurantId: string }) => {
  const { user } = useAuth();

  // Fetch wallet
  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ["restaurant-wallet", restaurantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_wallets")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (error) throw error;
      return data as WalletData | null;
    },
    enabled: !!restaurantId,
  });

  // Fetch recent commissions
  const { data: commissions } = useQuery({
    queryKey: ["restaurant-commissions", restaurantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("order_commissions")
        .select(`
          *,
          food_orders(order_number, status)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as OrderCommission[];
    },
    enabled: !!restaurantId,
  });

  // Fetch payouts
  const { data: payouts } = useQuery({
    queryKey: ["restaurant-payouts", restaurantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("restaurant_payouts")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Payout[];
    },
    enabled: !!restaurantId,
  });

  if (loadingWallet) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-8 bg-muted rounded w-1/2 mb-4" />
          <div className="h-6 bg-muted rounded w-1/3" />
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500",
    processing: "bg-blue-500",
    completed: "bg-green-500",
    failed: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      {/* Wallet Overview */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="font-medium">Available Balance</span>
            </div>
            <Badge>Restaurant Wallet</Badge>
          </div>
          <div className="text-4xl font-bold text-primary mb-6">
            ₱{(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <Button className="w-full" disabled>
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Request Payout (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Earnings</span>
            </div>
            <p className="text-xl font-bold">
              ₱{(wallet?.total_earnings || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Commission Paid</span>
            </div>
            <p className="text-xl font-bold">
              ₱{(wallet?.total_commission_paid || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {commissions?.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">Order #{c.food_orders?.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+₱{c.net_payout.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    -₱{c.commission_amount.toFixed(2)} fee
                  </p>
                </div>
              </div>
            ))}
            {!commissions?.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transactions yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      {payouts && payouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Payout History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payouts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">₱{p.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.payout_method} • {format(new Date(p.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge className={statusColors[p.status]}>
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Commission Structure</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Platform commission is automatically deducted from each order. Your net earnings are 
            credited to your wallet after order completion. VAT is calculated based on BIR requirements.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
