import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Diamond,
  CreditCard,
  Wallet,
  ShoppingBag,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: 'payout' | 'credit_purchase' | 'diamond_transaction' | 'order';
  amount: number;
  status: string;
  created_at: string;
  details: string;
  icon: 'payout' | 'credit' | 'diamond' | 'order';
}

export function RecentTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      setupRealtimeSubscription();
    }
  }, [user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('transactions-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payout_requests',
          filter: `user_id=eq.${user?.id}`
        },
        () => fetchTransactions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_purchases',
          filter: `user_id=eq.${user?.id}`
        },
        () => fetchTransactions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diamond_transactions',
          filter: `buyer_id=eq.${user?.id}`
        },
        () => fetchTransactions()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user?.id}`
        },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const allTransactions: Transaction[] = [];

      // Fetch payout requests
      const { data: payouts } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (payouts) {
        payouts.forEach(p => {
          allTransactions.push({
            id: p.id,
            type: 'payout',
            amount: p.amount,
            status: p.status,
            created_at: p.created_at || '',
            details: `Payout to ${p.payout_method} - ${p.account_name}`,
            icon: 'payout'
          });
        });
      }

      // Fetch credit purchases
      const { data: credits } = await supabase
        .from("credit_purchases")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (credits) {
        credits.forEach(c => {
          allTransactions.push({
            id: c.id,
            type: 'credit_purchase',
            amount: c.amount,
            status: c.status,
            created_at: c.created_at || '',
            details: `Credit purchase via ${c.payment_method} - ${c.credits} credits`,
            icon: 'credit'
          });
        });
      }

      // Fetch diamond transactions (purchases)
      const { data: diamonds } = await supabase
        .from("diamond_transactions")
        .select("*")
        .eq("buyer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (diamonds) {
        diamonds.forEach(d => {
          allTransactions.push({
            id: d.id,
            type: 'diamond_transaction',
            amount: d.total_price,
            status: d.status,
            created_at: d.created_at,
            details: `${d.transaction_type === 'purchase' ? 'Purchased' : 'Sold'} ${d.diamond_amount} diamonds`,
            icon: 'diamond'
          });
        });
      }

      // Fetch orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (orders) {
        orders.forEach(o => {
          allTransactions.push({
            id: o.id,
            type: 'order',
            amount: o.total_amount,
            status: o.status,
            created_at: o.created_at || '',
            details: `Order #${o.order_number}`,
            icon: 'order'
          });
        });
      }

      // Sort all by date
      allTransactions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(allTransactions.slice(0, 20));
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      pending: { variant: "secondary", icon: <Clock className="w-3 h-3" />, label: "Pending" },
      approved: { variant: "default", icon: <CheckCircle2 className="w-3 h-3" />, label: "Approved" },
      rejected: { variant: "destructive", icon: <XCircle className="w-3 h-3" />, label: "Rejected" },
      completed: { variant: "default", icon: <CheckCircle2 className="w-3 h-3" />, label: "Completed" },
      processing: { variant: "secondary", icon: <RefreshCw className="w-3 h-3 animate-spin" />, label: "Processing" },
      delivered: { variant: "default", icon: <CheckCircle2 className="w-3 h-3" />, label: "Delivered" },
      cancelled: { variant: "destructive", icon: <XCircle className="w-3 h-3" />, label: "Cancelled" },
    };

    const config = statusConfig[status] || { variant: "outline" as const, icon: <Clock className="w-3 h-3" />, label: status };

    return (
      <Badge variant={config.variant} className="gap-1 text-xs">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getTransactionIcon = (iconType: string) => {
    switch (iconType) {
      case 'payout':
        return <ArrowUpCircle className="w-8 h-8 text-red-500" />;
      case 'credit':
        return <CreditCard className="w-8 h-8 text-green-500" />;
      case 'diamond':
        return <Diamond className="w-8 h-8 text-amber-500" />;
      case 'order':
        return <ShoppingBag className="w-8 h-8 text-blue-500" />;
      default:
        return <Wallet className="w-8 h-8 text-primary" />;
    }
  };

  const getAmountDisplay = (transaction: Transaction) => {
    const isOutgoing = transaction.type === 'payout';
    const prefix = isOutgoing ? '-' : '+';
    const colorClass = isOutgoing ? 'text-red-500' : 'text-green-500';
    
    return (
      <span className={`font-bold ${colorClass}`}>
        {prefix}₱{transaction.amount.toLocaleString()}
      </span>
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">Recent Transactions</h3>
        <Button variant="ghost" size="sm" onClick={fetchTransactions}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No transactions yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div 
              key={`${transaction.type}-${transaction.id}`}
              className="flex items-center gap-4 p-4 bg-muted/10 rounded-lg hover:bg-muted/20 transition-colors"
            >
              <div className="flex-shrink-0">
                {getTransactionIcon(transaction.icon)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold capitalize text-sm">
                    {transaction.type.replace('_', ' ')}
                  </span>
                  {getStatusBadge(transaction.status)}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {transaction.details}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.created_at && format(new Date(transaction.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              
              <div className="text-right flex-shrink-0">
                {getAmountDisplay(transaction)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
