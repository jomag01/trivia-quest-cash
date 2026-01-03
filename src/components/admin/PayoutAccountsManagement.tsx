import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Wallet, Building2, CreditCard, Users, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PayoutAccount {
  id: string;
  user_id: string;
  account_type: string;
  account_name: string;
  account_number: string;
  bank_code?: string | null;
  is_default?: boolean;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    username: string | null;
  };
}

export default function PayoutAccountsManagement() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [adminAccounts, setAdminAccounts] = useState<PayoutAccount[]>([]);
  const [userAccounts, setUserAccounts] = useState<PayoutAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedUserAccounts, setSelectedUserAccounts] = useState<PayoutAccount[]>([]);
  const [showUserAccountsDialog, setShowUserAccountsDialog] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  
  const [newAccount, setNewAccount] = useState({
    account_type: "gcash",
    account_name: "",
    account_number: "",
    bank_code: "",
    is_default: false,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      // Fetch admin's own payout accounts
      if (user) {
        const { data: adminData, error: adminError } = await supabase
          .from("payout_accounts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (adminError) throw adminError;
        setAdminAccounts(adminData || []);
      }

      // Fetch all user payout accounts
      const { data: userData, error: userError } = await supabase
        .from("payout_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (userError) throw userError;
      
      // Fetch profile data for each unique user
      const userIds = [...new Set((userData || []).map(acc => acc.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, username")
        .in("id", userIds);
      
      const profilesMap = (profilesData || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
      
      const accountsWithProfiles = (userData || []).map(acc => ({
        ...acc,
        profiles: profilesMap[acc.user_id] || { full_name: null, email: null, username: null }
      }));
      
      setUserAccounts(accountsWithProfiles as PayoutAccount[]);
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      toast.error("Failed to load payout accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdminAccount = async () => {
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
        is_default: newAccount.is_default,
      }]);

      if (error) throw error;

      toast.success("Admin payout account added successfully");
      setShowAddDialog(false);
      setNewAccount({
        account_type: "gcash",
        account_name: "",
        account_number: "",
        bank_code: "",
        is_default: false,
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

  const viewUserAccounts = (userId: string, userName: string) => {
    const accounts = userAccounts.filter(acc => acc.user_id === userId);
    setSelectedUserAccounts(accounts);
    setSelectedUserName(userName);
    setShowUserAccountsDialog(true);
  };

  // Group accounts by user
  const groupedUserAccounts = userAccounts.reduce((acc, account) => {
    if (!acc[account.user_id]) {
      acc[account.user_id] = {
        user: account.profiles,
        accounts: []
      };
    }
    acc[account.user_id].accounts.push(account);
    return acc;
  }, {} as Record<string, { user: any; accounts: PayoutAccount[] }>);

  const filteredUsers = Object.entries(groupedUserAccounts).filter(([userId, data]) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      data.user?.full_name?.toLowerCase().includes(searchLower) ||
      data.user?.email?.toLowerCase().includes(searchLower) ||
      data.user?.username?.toLowerCase().includes(searchLower) ||
      data.accounts.some(acc => 
        acc.account_name.toLowerCase().includes(searchLower) ||
        acc.account_number.includes(searchQuery)
      )
    );
  });

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

  const getAccountBadgeColor = (type: string) => {
    switch (type) {
      case 'gcash':
        return 'bg-blue-500';
      case 'maya':
        return 'bg-green-500';
      case 'bank':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="admin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="admin" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Admin Accounts
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            User Accounts
          </TabsTrigger>
        </TabsList>

        {/* Admin Accounts Tab */}
        <TabsContent value="admin" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  Admin Payout Accounts
                </CardTitle>
                <CardDescription>
                  Configure your admin payment accounts for receiving funds
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </CardHeader>
            <CardContent>
              {adminAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No admin payout accounts configured</p>
                  <p className="text-sm">Add accounts to receive withdrawals and transfers</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {adminAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-amber-500/5 to-orange-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getAccountBadgeColor(account.account_type)} text-white`}>
                          {getAccountIcon(account.account_type)}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {account.account_name}
                            {account.is_default && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {account.account_type.toUpperCase()} 
                            {account.bank_code && ` - ${account.bank_code}`} 
                            {" • "}{account.account_number}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Accounts Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                User Payout Accounts
              </CardTitle>
              <CardDescription>
                View all user withdrawal accounts
              </CardDescription>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or account..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Accounts</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No users found with payout accounts
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(([userId, data]) => (
                        <TableRow key={userId}>
                          <TableCell className="font-medium">
                            {data.user?.full_name || data.user?.username || "Unknown"}
                          </TableCell>
                          <TableCell>{data.user?.email || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {data.accounts.slice(0, 3).map((acc, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="secondary" 
                                  className="text-xs"
                                >
                                  {acc.account_type.toUpperCase()}
                                </Badge>
                              ))}
                              {data.accounts.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{data.accounts.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewUserAccounts(userId, data.user?.full_name || "User")}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Admin Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Admin Payout Account
            </DialogTitle>
            <DialogDescription>
              Add a new payment account for receiving funds
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
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya (PayMaya)</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
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
                onClick={handleAddAdminAccount}
                disabled={adding || !newAccount.account_name || !newAccount.account_number}
                className="flex-1"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Accounts Dialog */}
      <Dialog open={showUserAccountsDialog} onOpenChange={setShowUserAccountsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {selectedUserName}'s Payout Accounts
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {selectedUserAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getAccountBadgeColor(account.account_type)} text-white`}>
                      {getAccountIcon(account.account_type)}
                    </div>
                    <div>
                      <div className="font-medium">{account.account_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {account.account_type.toUpperCase()} 
                        {account.bank_code && ` - ${account.bank_code}`}
                      </div>
                      <div className="text-sm font-mono">{account.account_number}</div>
                    </div>
                  </div>
                  {account.is_default && (
                    <Badge variant="secondary">Default</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
