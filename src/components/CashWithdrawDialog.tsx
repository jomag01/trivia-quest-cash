import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wallet, Building2, Trash2, Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PayoutAccount {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  bank_code?: string;
}

interface CashWithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentBalance: number;
  onSuccess: () => void;
}

export default function CashWithdrawDialog({
  open,
  onOpenChange,
  userId,
  currentBalance,
  onSuccess
}: CashWithdrawDialogProps) {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [newAccount, setNewAccount] = useState({
    account_type: "gcash",
    account_name: "",
    account_number: "",
    bank_code: "",
  });

  useEffect(() => {
    if (open) {
      fetchPayoutAccounts();
    }
  }, [open]);

  const fetchPayoutAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from("payout_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load payout accounts");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.account_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("payout_accounts").insert([{
        ...newAccount,
        user_id: userId,
      }]);

      if (error) throw error;

      toast.success("Payout account added successfully");
      setShowAddAccount(false);
      setNewAccount({
        account_type: "gcash",
        account_name: "",
        account_number: "",
        bank_code: "",
      });
      fetchPayoutAccounts();
    } catch (error: any) {
      console.error("Error adding account:", error);
      toast.error(error.message || "Failed to add account");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from("payout_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;

      toast.success("Account deleted successfully");
      fetchPayoutAccounts();
      if (selectedAccount === accountId) {
        setSelectedAccount("");
      }
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (Number(amount) > currentBalance) {
      toast.error("Insufficient balance in cash wallet");
      return;
    }

    if (!selectedAccount) {
      toast.error("Please select a payout account");
      return;
    }

    setLoading(true);
    try {
      const account = accounts.find(acc => acc.id === selectedAccount);
      if (!account) throw new Error("Account not found");

      // Create payout request for admin approval
      const { error: payoutError } = await supabase
        .from("payout_requests")
        .insert([{
          user_id: userId,
          amount: Number(amount),
          payout_method: account.account_type,
          account_name: account.account_name,
          account_number: account.account_number,
          bank_name: account.account_type === 'bank' ? account.bank_code : null,
          status: 'pending',
          notes: `Cash wallet withdrawal request`
        }]);

      if (payoutError) throw payoutError;

      // Deduct from cash wallet
      const { error: walletError } = await supabase
        .from("cash_wallets")
        .update({ 
          balance: currentBalance - Number(amount),
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (walletError) throw walletError;

      // Record transaction
      await supabase.from("cash_transactions").insert({
        user_id: userId,
        amount: -Number(amount),
        balance_before: currentBalance,
        balance_after: currentBalance - Number(amount),
        transaction_type: 'withdrawal',
        description: `Withdrawal to ${account.account_type.toUpperCase()} - ${account.account_number}`
      });

      toast.success("Withdrawal request submitted! Admin will review your request.");
      onOpenChange(false);
      setAmount("");
      onSuccess();
    } catch (error: any) {
      console.error("Withdraw error:", error);
      toast.error(error.message || "Failed to process withdrawal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Withdraw Cash
          </DialogTitle>
          <DialogDescription>
            Withdraw from your cash wallet to GCash, Maya, or bank
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance Card */}
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-4">
              <span className="text-sm text-muted-foreground">Available Balance</span>
              <div className="text-3xl font-bold text-green-600">
                ₱{currentBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          {!showAddAccount ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PHP)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  max={currentBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min: ₱100</span>
                  <span>Max: ₱{currentBalance.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Payout Account</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddAccount(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New
                  </Button>
                </div>

                {loadingAccounts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : accounts.length > 0 ? (
                  <div className="space-y-2">
                    {accounts.map((account) => (
                      <div
                        key={account.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedAccount === account.id
                            ? "bg-primary/10 border-primary"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => setSelectedAccount(account.id)}
                      >
                        <div className="flex items-center gap-3">
                          {account.account_type === "bank" ? (
                            <Building2 className="w-5 h-5 text-primary" />
                          ) : (
                            <Wallet className="w-5 h-5 text-primary" />
                          )}
                          <div>
                            <div className="font-medium">{account.account_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {account.account_type.toUpperCase()} - {account.account_number}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAccount(account.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No payout accounts added yet
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={loading || !selectedAccount || !amount || Number(amount) > currentBalance}
                  className="flex-1"
                >
                  {loading ? "Processing..." : "Withdraw"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <Select
                    value={newAccount.account_type}
                    onValueChange={(value) =>
                      setNewAccount({ ...newAccount, account_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gcash">GCash</SelectItem>
                      <SelectItem value="maya">Maya (PayMaya)</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    value={newAccount.account_name}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, account_name: e.target.value })
                    }
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_number">
                    {newAccount.account_type === "bank" ? "Account Number" : "Mobile Number"}
                  </Label>
                  <Input
                    id="account_number"
                    value={newAccount.account_number}
                    onChange={(e) =>
                      setNewAccount({ ...newAccount, account_number: e.target.value })
                    }
                    placeholder={newAccount.account_type === "bank" ? "1234567890" : "09XXXXXXXXX"}
                  />
                </div>

                {newAccount.account_type === "bank" && (
                  <div className="space-y-2">
                    <Label htmlFor="bank_code">Bank Name</Label>
                    <Select
                      value={newAccount.bank_code}
                      onValueChange={(value) =>
                        setNewAccount({ ...newAccount, bank_code: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BDO">BDO Unibank</SelectItem>
                        <SelectItem value="BPI">BPI</SelectItem>
                        <SelectItem value="UNIONBANK">UnionBank</SelectItem>
                        <SelectItem value="METROBANK">Metrobank</SelectItem>
                        <SelectItem value="LANDBANK">Land Bank</SelectItem>
                        <SelectItem value="PNB">PNB</SelectItem>
                        <SelectItem value="RCBC">RCBC</SelectItem>
                        <SelectItem value="CHINABANK">China Bank</SelectItem>
                        <SelectItem value="SECURITYBANK">Security Bank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAddAccount(false)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleAddAccount}
                  disabled={loading || !newAccount.account_name || !newAccount.account_number}
                  className="flex-1"
                >
                  {loading ? "Adding..." : "Add Account"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
