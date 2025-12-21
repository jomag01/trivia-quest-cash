import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wallet, Building2, Trash2, GitBranch, Diamond, TrendingUp, Users, Award, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PayoutAccount {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  bank_code?: string;
}

interface EarningsBreakdown {
  unilevel: number;
  stairstep: number;
  leadership: number;
  binary: number;
  diamonds: number;
  total: number;
}

interface CashOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBalance?: number;
  defaultSource?: "diamonds" | "binary";
}

export const CashOutDialog = ({ open, onOpenChange, initialBalance = 0, defaultSource = "diamonds" }: CashOutDialogProps) => {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [earnings, setEarnings] = useState<EarningsBreakdown>({
    unilevel: 0,
    stairstep: 0,
    leadership: 0,
    binary: 0,
    diamonds: 0,
    total: 0
  });
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [diamondPrice, setDiamondPrice] = useState(10);
  
  const [newAccount, setNewAccount] = useState({
    account_type: "gcash",
    account_name: "",
    account_number: "",
    bank_code: "",
  });

  useEffect(() => {
    if (open) {
      fetchPayoutAccounts();
      fetchAllEarnings();
    }
  }, [open]);

  const fetchAllEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all commission types
      const [unilevelResult, stairstepResult, leadershipResult, binaryResult, diamondsResult, diamondPriceResult] = await Promise.all([
        // Unilevel commissions
        supabase
          .from("commissions")
          .select("amount")
          .eq("user_id", user.id)
          .in("commission_type", ["unilevel", "ai_credit_unilevel", "direct_referral"]),
        
        // Stairstep commissions
        supabase
          .from("commissions")
          .select("amount")
          .eq("user_id", user.id)
          .in("commission_type", ["stairstep", "ai_credit_stairstep"]),
        
        // Leadership commissions
        supabase
          .from("leadership_commissions")
          .select("amount")
          .eq("upline_id", user.id),
        
        // Binary commissions
        supabase
          .from("binary_commissions")
          .select("amount")
          .eq("user_id", user.id),
        
        // Diamond balance
        supabase
          .from("treasure_wallet")
          .select("diamonds")
          .eq("user_id", user.id)
          .maybeSingle(),
        
        // Diamond price
        supabase
          .from("treasure_admin_settings")
          .select("setting_value")
          .eq("setting_key", "base_diamond_price")
          .maybeSingle()
      ]);

      const unilevelTotal = (unilevelResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const stairstepTotal = (stairstepResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const leadershipTotal = (leadershipResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      const binaryTotal = (binaryResult.data || []).reduce((sum, c) => sum + Number(c.amount), 0);
      
      const diamonds = diamondsResult.data?.diamonds || 0;
      const basePrice = diamondPriceResult.data?.setting_value ? parseFloat(diamondPriceResult.data.setting_value) : 10;
      const diamondValue = diamonds * basePrice;

      setTotalDiamonds(diamonds);
      setDiamondPrice(basePrice);
      
      const totalEarnings = unilevelTotal + stairstepTotal + leadershipTotal + binaryTotal + diamondValue;
      
      setEarnings({
        unilevel: unilevelTotal,
        stairstep: stairstepTotal,
        leadership: leadershipTotal,
        binary: binaryTotal,
        diamonds: diamondValue,
        total: totalEarnings
      });
    } catch (error: any) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load earnings");
    }
  };

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

  const handleCashOutAll = () => {
    setAmount(earnings.total.toFixed(2));
  };

  const handleCashOut = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (Number(amount) > earnings.total) {
      toast.error("Insufficient balance");
      return;
    }

    if (!selectedAccount) {
      toast.error("Please select a payout account");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check referral count before allowing withdrawal
      const { data: referralData, error: referralError } = await supabase.rpc('get_referral_count', {
        p_user_id: user.id
      });

      if (referralError) throw referralError;

      const referralCount = referralData || 0;
      if (referralCount < 2) {
        toast.error("🔒 Withdrawal Locked!", {
          description: `You need 2 referrals to withdraw earnings. Current: ${referralCount}/2`,
          duration: 5000
        });
        setLoading(false);
        return;
      }

      // Get selected account details
      const account = accounts.find(acc => acc.id === selectedAccount);
      if (!account) throw new Error("Account not found");

      // Build breakdown notes
      const breakdownNotes = `
Earnings Breakdown:
- Unilevel: ₱${earnings.unilevel.toFixed(2)}
- Stairstep: ₱${earnings.stairstep.toFixed(2)}
- Leadership: ₱${earnings.leadership.toFixed(2)}
- Binary: ₱${earnings.binary.toFixed(2)}
- Diamonds: ₱${earnings.diamonds.toFixed(2)} (${totalDiamonds} 💎)
Total: ₱${earnings.total.toFixed(2)}
      `.trim();

      // Create payout request for admin approval
      const { error: payoutError } = await supabase
        .from("payout_requests")
        .insert([{
          user_id: user.id,
          amount: Number(amount),
          payout_method: account.account_type,
          account_name: account.account_name,
          account_number: account.account_number,
          bank_name: account.account_type === 'bank' ? account.bank_code : null,
          status: 'pending',
          notes: breakdownNotes
        }]);

      if (payoutError) throw payoutError;

      toast.success("Withdrawal request submitted! Admin will review your request.");
      onOpenChange(false);
      setAmount("");
    } catch (error: any) {
      console.error("Cash out error:", error);
      toast.error(error.message || "Failed to process cash out");
    } finally {
      setLoading(false);
    }
  };

  const earningsItems = [
    { label: "Unilevel", value: earnings.unilevel, icon: Users, color: "text-blue-500" },
    { label: "Stairstep", value: earnings.stairstep, icon: TrendingUp, color: "text-green-500" },
    { label: "Leadership", value: earnings.leadership, icon: Award, color: "text-purple-500" },
    { label: "Binary", value: earnings.binary, icon: GitBranch, color: "text-orange-500" },
    { label: "Diamonds", value: earnings.diamonds, icon: Diamond, color: "text-cyan-500", subtext: `${totalDiamonds.toLocaleString()} 💎` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            Cash Out Earnings
          </DialogTitle>
          <DialogDescription>
            Withdraw your consolidated earnings to GCash, Maya, or bank
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total Earnings Card */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Available</span>
                <Button variant="outline" size="sm" onClick={handleCashOutAll}>
                  Cash Out All
                </Button>
              </div>
              <div className="text-3xl font-bold text-primary">₱{earnings.total.toFixed(2)}</div>
            </CardContent>
          </Card>

          {/* Earnings Breakdown */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Earnings Breakdown</Label>
            <div className="grid grid-cols-2 gap-2">
              {earningsItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 p-2 bg-accent/50 rounded-lg"
                >
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="font-medium text-sm truncate">
                      ₱{item.value.toFixed(2)}
                      {item.subtext && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({item.subtext})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!showAddAccount ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (PHP)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  max={earnings.total}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                />
                <p className="text-xs text-muted-foreground">
                  Max: ₱{earnings.total.toFixed(2)}
                </p>
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
