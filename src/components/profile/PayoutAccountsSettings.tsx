import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Wallet, Building2, CreditCard, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface PayoutAccount {
  id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  bank_code?: string | null;
  is_default?: boolean;
  created_at: string;
}

export function PayoutAccountsSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [newAccount, setNewAccount] = useState({
    account_type: "gcash",
    account_name: "",
    account_number: "",
    bank_code: "",
  });

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payout_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load payout accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!user) return;
    if (!newAccount.account_name || !newAccount.account_number) {
      toast.error("Please fill in all required fields");
      return;
    }

    setAdding(true);
    try {
      const { error } = await supabase.from("payout_accounts").insert([{
        user_id: user.id,
        account_type: newAccount.account_type,
        account_name: newAccount.account_name,
        account_number: newAccount.account_number,
        bank_code: newAccount.account_type === 'bank' ? newAccount.bank_code : null,
        is_default: accounts.length === 0, // First account is default
      }]);

      if (error) throw error;

      toast.success("Payout account added successfully");
      setShowAddDialog(false);
      setNewAccount({
        account_type: "gcash",
        account_name: "",
        account_number: "",
        bank_code: "",
      });
      fetchAccounts();
    } catch (error: any) {
      console.error("Error adding account:", error);
      toast.error(error.message || "Failed to add account");
    } finally {
      setAdding(false);
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
      fetchAccounts();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  const handleSetDefault = async (accountId: string) => {
    if (!user) return;
    try {
      // Remove default from all accounts
      await supabase
        .from("payout_accounts")
        .update({ is_default: false })
        .eq("user_id", user.id);

      // Set new default
      const { error } = await supabase
        .from("payout_accounts")
        .update({ is_default: true })
        .eq("id", accountId);

      if (error) throw error;

      toast.success("Default account updated");
      fetchAccounts();
    } catch (error: any) {
      console.error("Error setting default:", error);
      toast.error("Failed to update default account");
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank':
        return <Building2 className="w-4 h-4" />;
      case 'gcash':
      case 'maya':
        return <Wallet className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getAccountColor = (type: string) => {
    switch (type) {
      case 'gcash':
        return 'bg-blue-500 text-white';
      case 'maya':
        return 'bg-green-500 text-white';
      case 'bank':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-500" />
              Payout Accounts
            </CardTitle>
            <CardDescription>
              Manage your withdrawal accounts for GCash, Maya, and bank transfers
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            <Plus className="w-4 h-4" />
            Add Account
          </Button>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No payout accounts configured</p>
              <p className="text-sm">Add your GCash, Maya, or bank account to receive withdrawals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-full ${getAccountColor(account.account_type)}`}>
                      {getAccountIcon(account.account_type)}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {account.account_name}
                        {account.is_default && (
                          <Badge variant="secondary" className="text-xs gap-1 bg-amber-500/20 text-amber-600">
                            <Star className="w-3 h-3 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {account.account_type.toUpperCase()} 
                        {account.bank_code && ` • ${account.bank_code}`}
                      </div>
                      <div className="text-sm font-mono text-muted-foreground">
                        {account.account_number}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Add Payout Account
            </DialogTitle>
            <DialogDescription>
              Add a new account to receive your withdrawals
            </DialogDescription>
          </DialogHeader>
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
                  <SelectItem value="gcash">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-blue-500" />
                      GCash
                    </div>
                  </SelectItem>
                  <SelectItem value="maya">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-green-500" />
                      Maya (PayMaya)
                    </div>
                  </SelectItem>
                  <SelectItem value="bank">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      Bank Account
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input
                value={newAccount.account_name}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, account_name: e.target.value })
                }
                placeholder="Juan Dela Cruz"
              />
            </div>

            <div className="space-y-2">
              <Label>
                {newAccount.account_type === "bank" ? "Account Number" : "Mobile Number"}
              </Label>
              <Input
                value={newAccount.account_number}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, account_number: e.target.value })
                }
                placeholder={newAccount.account_type === "bank" ? "1234567890" : "09XXXXXXXXX"}
              />
            </div>

            {newAccount.account_type === "bank" && (
              <div className="space-y-2">
                <Label>Bank Name</Label>
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
                    {/* Major Universal Banks */}
                    <SelectItem value="BDO">BDO Unibank</SelectItem>
                    <SelectItem value="BPI">BPI (Bank of the Philippine Islands)</SelectItem>
                    <SelectItem value="METROBANK">Metrobank</SelectItem>
                    <SelectItem value="LANDBANK">Land Bank of the Philippines</SelectItem>
                    <SelectItem value="PNB">PNB (Philippine National Bank)</SelectItem>
                    <SelectItem value="CHINABANK">China Bank</SelectItem>
                    <SelectItem value="SECURITYBANK">Security Bank</SelectItem>
                    <SelectItem value="UNIONBANK">UnionBank</SelectItem>
                    <SelectItem value="RCBC">RCBC</SelectItem>
                    <SelectItem value="DBP">DBP (Development Bank of the Philippines)</SelectItem>
                    <SelectItem value="EWB">EastWest Bank</SelectItem>
                    <SelectItem value="AUB">Asia United Bank (AUB)</SelectItem>
                    <SelectItem value="PSB">Philippine Savings Bank (PSBank)</SelectItem>
                    <SelectItem value="PBCOM">PBCOM (Philippine Bank of Communications)</SelectItem>
                    <SelectItem value="PHILTRUST">Philtrust Bank</SelectItem>
                    <SelectItem value="ROBINSONSBANK">Robinsons Bank</SelectItem>
                    <SelectItem value="CTBC">CTBC Bank Philippines</SelectItem>
                    <SelectItem value="MAYBANK">Maybank Philippines</SelectItem>
                    <SelectItem value="HSBC">HSBC Philippines</SelectItem>
                    <SelectItem value="CITIBANK">Citibank Philippines</SelectItem>
                    <SelectItem value="STANDARDCHARTERED">Standard Chartered Bank</SelectItem>
                    {/* Digital Banks */}
                    <SelectItem value="GOTYME">GoTyme Bank</SelectItem>
                    <SelectItem value="MAYABANK">Maya Bank</SelectItem>
                    <SelectItem value="CIMB">CIMB Bank Philippines</SelectItem>
                    <SelectItem value="TONIKBANK">Tonik Digital Bank</SelectItem>
                    <SelectItem value="UNOBANKPH">UNObank</SelectItem>
                    <SelectItem value="SEABANK">SeaBank Philippines</SelectItem>
                    <SelectItem value="KOMO">KOMO (EastWest Digital)</SelectItem>
                    <SelectItem value="DISKARTECH">DiskarTech (RCBC)</SelectItem>
                    {/* Rural/Thrift/Others */}
                    <SelectItem value="STERLING">Sterling Bank of Asia</SelectItem>
                    <SelectItem value="UCPB">UCPB (United Coconut Planters Bank)</SelectItem>
                    <SelectItem value="VETERANS">Veterans Bank</SelectItem>
                    <SelectItem value="ALLBANK">AllBank (A Thrift Bank)</SelectItem>
                    <SelectItem value="DUNGGANON">Dungganon Bank</SelectItem>
                    <SelectItem value="CARDBANK">CARD Bank</SelectItem>
                    <SelectItem value="QUEENBANK">Queenbank</SelectItem>
                    <SelectItem value="NETBANK">Netbank (PAYMAYA)</SelectItem>
                    <SelectItem value="ING">ING Bank Philippines</SelectItem>
                    <SelectItem value="CANTILAN">Cantilan Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={adding || !newAccount.account_name || !newAccount.account_number}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
