import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gem, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DiamondTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string;
  reference_id: string | null;
  created_at: string;
}

export const DiamondHistory = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DiamondTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('diamond-transactions-channel')
        .on(
          'postgres_changes' as any,
          {
            event: 'INSERT',
            schema: 'public',
            table: 'diamond_transactions',
            filter: `user_id=eq.${user.id}`
          } as any,
          (payload: any) => {
            setTransactions(prev => [payload.new as DiamondTransaction, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("diamond_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions((data as DiamondTransaction[]) || []);
    } catch (error: any) {
      console.error("Error fetching diamond transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalCredits = () => {
    return transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalDebits = () => {
    return transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  if (loading) {
    return <div>Loading diamond history...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gem className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Diamond History</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-3xl font-bold text-green-500">
                {getTotalCredits().toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-3xl font-bold text-red-500">
                {getTotalDebits().toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg">
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </Card>
      </div>

      {transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <Gem className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No diamond transactions yet</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="text-sm">
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={transaction.type === 'credit' ? 'default' : 'secondary'}
                      className={
                        transaction.type === 'credit'
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                      }
                    >
                      {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        transaction.type === 'credit'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                      {transaction.amount.toLocaleString()}
                      <Gem className="inline h-4 w-4 ml-1" />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};
