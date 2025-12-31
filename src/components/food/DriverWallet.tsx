import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, TrendingUp, Heart, ArrowDownToLine, Coins } from "lucide-react";
import { format } from "date-fns";

interface WalletData {
  balance: number;
  total_earnings: number;
  total_tips: number;
  pending_withdrawal: number;
}

interface TipHistory {
  id: string;
  amount: number;
  created_at: string;
  food_orders?: {
    order_number: string;
  };
}

export const DriverWallet = ({ riderId }: { riderId: string }) => {
  const { user } = useAuth();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["driver-wallet", riderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_wallets")
        .select("*")
        .eq("driver_id", riderId)
        .maybeSingle();
      if (error) throw error;
      return data as WalletData | null;
    },
    enabled: !!riderId,
  });

  const { data: recentTips } = useQuery({
    queryKey: ["driver-tips-history", riderId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("driver_tips")
        .select(`
          id,
          amount,
          created_at,
          food_orders(order_number)
        `)
        .eq("driver_id", riderId)
        .eq("status", "credited")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as TipHistory[];
    },
    enabled: !!riderId,
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-muted rounded w-1/3" />
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Wallet className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Wallet not available yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Available Balance</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-primary mb-4">
            ₱{wallet.balance?.toFixed(2) || "0.00"}
          </div>
          <Button className="w-full" variant="outline" disabled>
            <ArrowDownToLine className="w-4 h-4 mr-2" />
            Withdraw (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Earnings</span>
            </div>
            <p className="text-lg font-bold">₱{wallet.total_earnings?.toFixed(2) || "0.00"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="text-xs">Total Tips</span>
            </div>
            <p className="text-lg font-bold">₱{wallet.total_tips?.toFixed(2) || "0.00"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tips */}
      {recentTips && recentTips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Recent Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {recentTips.map((tip) => (
                <div
                  key={tip.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">₱{tip.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      Order #{tip.food_orders?.order_number}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(tip.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
