import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowUpCircle, ArrowDownCircle, RefreshCw, History } from 'lucide-react';
import { format } from 'date-fns';

interface CashTransactionHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export default function CashTransactionHistory({ open, onOpenChange, userId }: CashTransactionHistoryProps) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['cash-transactions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  const { data: pendingDeposits = [] } = useQuery({
    queryKey: ['all-deposit-requests', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_deposit_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open && !!userId,
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowUpCircle className="w-5 h-5 text-green-500" />;
      case 'withdrawal':
      case 'purchase':
        return <ArrowDownCircle className="w-5 h-5 text-red-500" />;
      case 'conversion':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      default:
        return <History className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            Transaction History
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Pending Deposit Requests */}
              {pendingDeposits.filter(d => d.status === 'pending').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Pending Deposits</h3>
                  <div className="space-y-2">
                    {pendingDeposits.filter(d => d.status === 'pending').map((deposit) => (
                      <div
                        key={deposit.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-yellow-100">
                            <ArrowUpCircle className="w-4 h-4 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium">Deposit Request</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(deposit.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-yellow-600">
                            +₱{Number(deposit.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs">
                            Awaiting Approval
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transaction History */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Completed Transactions</h3>
                {transactions.length === 0 && pendingDeposits.filter(d => d.status !== 'pending').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(tx.transaction_type)}
                          <div>
                            <p className="font-medium capitalize">{tx.transaction_type}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.description || tx.reference_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${Number(tx.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(tx.amount) >= 0 ? '+' : ''}₱{Math.abs(Number(tx.amount)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Bal: ₱{Number(tx.balance_after).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Past deposit requests */}
                    {pendingDeposits.filter(d => d.status !== 'pending').map((deposit) => (
                      <div
                        key={deposit.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          deposit.status === 'approved' ? 'bg-green-50/50 dark:bg-green-900/20' : 'bg-red-50/50 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <ArrowUpCircle className={`w-5 h-5 ${deposit.status === 'approved' ? 'text-green-500' : 'text-red-500'}`} />
                          <div>
                            <p className="font-medium">Deposit Request</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(deposit.created_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            ₱{Number(deposit.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                          {getStatusBadge(deposit.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
