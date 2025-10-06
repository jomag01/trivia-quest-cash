import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, Building2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PayoutAccount {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  bank_code?: string;
}

interface CashOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
}

export const CashOutDialog = ({ open, onOpenChange, currentBalance }: CashOutDialogProps) => {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  
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
    try {
      const { data, error } = await supabase
        .from("payout_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load payout accounts");
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.account_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("payout_accounts").insert([{
        ...newAccount,
        user_id: user.id,
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

  const handleCashOut = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (Number(amount) > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!selectedAccount) {
      toast.error("Please select a payout account");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-payout", {
        body: {
          amount: Number(amount),
          payoutAccountId: selectedAccount,
        },
      });

      if (error) throw error;

      toast.success(data.message || "Cash out request submitted successfully");
      onOpenChange(false);
      setAmount("");
    } catch (error: any) {
      console.error("Cash out error:", error);
      toast.error(error.message || "Failed to process cash out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cash Out</DialogTitle>
          <DialogDescription>
            Withdraw your earnings to your GCash, Maya, or bank account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-4 bg-accent/50 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Available Balance</div>
            <div className="text-2xl font-bold text-primary">₱{currentBalance.toFixed(2)}</div>
          </div>

          {!showAddAccount ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PHP)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  max={currentBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
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

                {accounts.length > 0 ? (
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
                  onClick={handleCashOut}
                  disabled={loading || !selectedAccount || !amount}
                  className="flex-1"
                >
                  {loading ? "Processing..." : "Cash Out"}
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
                    placeholder={newAccount.account_type === "bank" ? "1234567890" : "09123456789"}
                  />
                </div>

                {newAccount.account_type === "bank" && (
                  <div className="space-y-2">
                    <Label htmlFor="bank_code">Bank Code (Optional)</Label>
                    <Input
                      id="bank_code"
                      value={newAccount.bank_code}
                      onChange={(e) =>
                        setNewAccount({ ...newAccount, bank_code: e.target.value })
                      }
                      placeholder="BPI, BDO, etc."
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddAccount(false)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleAddAccount} disabled={loading} className="flex-1">
                  {loading ? "Adding..." : "Add Account"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};