import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Check, X, ExternalLink, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string;
  receipt_url: string | null;
  created_at: string;
  metadata: any;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export const TransactionManager = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("type", "credit_purchase")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load transactions");
      return;
    }

    // Fetch user profiles separately
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(t => t.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const enrichedData = data.map(t => ({
        ...t,
        profiles: profilesMap.get(t.user_id) || null
      }));

      setTransactions(enrichedData as any);
    } else {
      setTransactions(data || []);
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    if (!confirm(`Approve ${transaction.metadata?.credits || 0} credits for this user?`)) return;

    setLoading(true);
    try {
      // Update transaction status
      const { error: txError } = await supabase
        .from("transactions")
        .update({ status: "completed" })
        .eq("id", transaction.id);

      if (txError) throw txError;

      // Update user credits
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", transaction.user_id)
        .single();

      if (profileError) throw profileError;

      const newCredits = (profile?.credits || 0) + (transaction.metadata?.credits || 0);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: newCredits })
        .eq("id", transaction.user_id);

      if (updateError) throw updateError;

      toast.success("Transaction approved and credits added!");
      fetchTransactions();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error(error.message || "Failed to approve transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!confirm("Reject this transaction? This cannot be undone.")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("id", transactionId);

      if (error) throw error;

      toast.success("Transaction rejected");
      fetchTransactions();
    } catch (error: any) {
      console.error("Rejection error:", error);
      toast.error(error.message || "Failed to reject transaction");
    } finally {
      setLoading(false);
    }
  };

  const pendingTransactions = transactions.filter(t => t.status === "pending");
  const completedTransactions = transactions.filter(t => t.status === "completed");
  const failedTransactions = transactions.filter(t => t.status === "failed");

  return (
    <div className="space-y-6">
      {/* Pending Transactions */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Pending Approval ({pendingTransactions.length})
        </h3>
        <div className="grid gap-4">
          {pendingTransactions.map((transaction) => (
            <Card key={transaction.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-medium">
                      PENDING
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-semibold">
                    User: {transaction.profiles?.full_name || transaction.profiles?.email || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">Amount: ₱{transaction.amount}</p>
                  <p className="text-sm text-muted-foreground">
                    Credits: {transaction.metadata?.credits || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Method: {transaction.payment_method?.toUpperCase()}
                  </p>
                  {transaction.receipt_url && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => setSelectedReceipt(transaction.receipt_url)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Receipt
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(transaction)}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(transaction.id)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {pendingTransactions.length === 0 && (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No pending transactions</p>
            </Card>
          )}
        </div>
      </div>

      {/* Completed Transactions */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Check className="w-5 h-5 text-green-500" />
          Completed ({completedTransactions.length})
        </h3>
        <div className="grid gap-4">
          {completedTransactions.slice(0, 5).map((transaction) => (
            <Card key={transaction.id} className="p-4 opacity-75">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-medium mr-2">
                    COMPLETED
                  </span>
                  <span className="font-semibold">
                    {transaction.profiles?.full_name || transaction.profiles?.email || "Unknown"}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">
                    - ₱{transaction.amount} ({transaction.metadata?.credits || 0} credits)
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(transaction.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <img
              src={selectedReceipt}
              alt="Payment receipt"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
