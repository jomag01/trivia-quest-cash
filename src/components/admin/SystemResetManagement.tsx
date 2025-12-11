import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Trash2, Loader2, RefreshCw, Download, Search, User, Database } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ResetOption {
  id: string;
  label: string;
  description: string;
  tables: string[];
  dangerous: boolean;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  referral_code: string | null;
}

const resetOptions: ResetOption[] = [
  {
    id: "orders",
    label: "Orders & Sales",
    description: "Reset all product orders, order items, and sales records",
    tables: ["order_items", "orders"],
    dangerous: true,
  },
  {
    id: "food_orders",
    label: "Food Orders",
    description: "Reset all food orders, food order items, and delivery assignments",
    tables: ["food_order_items", "delivery_assignments", "food_orders"],
    dangerous: true,
  },
  {
    id: "wallets",
    label: "Wallets (Credits & Diamonds)",
    description: "Reset all user treasure wallets (diamonds, gems, credits) to zero",
    tables: ["treasure_wallet"],
    dangerous: true,
  },
  {
    id: "commissions",
    label: "Commissions & Earnings",
    description: "Reset all commission records (unilevel, stair-step, leadership)",
    tables: ["commissions", "leadership_commissions"],
    dangerous: true,
  },
  {
    id: "credit_purchases",
    label: "Credit Purchases",
    description: "Reset all credit purchase records and payment proofs",
    tables: ["credit_purchases"],
    dangerous: true,
  },
  {
    id: "payout_requests",
    label: "Payout Requests",
    description: "Reset all payout/withdrawal requests",
    tables: ["payout_requests"],
    dangerous: true,
  },
  {
    id: "affiliate_ranks",
    label: "Affiliate Rankings",
    description: "Reset affiliate rank history, monthly sales, and current ranks",
    tables: ["affiliate_rank_history", "affiliate_monthly_sales", "affiliate_current_rank"],
    dangerous: true,
  },
  {
    id: "diamond_marketplace",
    label: "Diamond Marketplace",
    description: "Reset all diamond listings and transactions",
    tables: ["diamond_transactions", "diamond_marketplace"],
    dangerous: true,
  },
  {
    id: "game_progress",
    label: "Game Progress",
    description: "Reset all game level completions, MOBA progress, and player heroes",
    tables: ["game_level_completions", "moba_level_completions", "moba_player_progress", "moba_player_heroes", "moba_purchases"],
    dangerous: true,
  },
  {
    id: "bookings",
    label: "Service Bookings",
    description: "Reset all service booking records",
    tables: ["service_bookings"],
    dangerous: true,
  },
  {
    id: "live_streams",
    label: "Live Streams",
    description: "Reset all live stream records, comments, and gifts",
    tables: ["live_stream_comments", "live_stream_gifts", "live_stream_products", "live_streams"],
    dangerous: true,
  },
  {
    id: "social_posts",
    label: "Social Media Posts",
    description: "Reset all posts, comments, reactions, and stories",
    tables: ["comment_reactions", "post_comments", "post_reactions", "posts", "stories"],
    dangerous: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Clear all user notifications",
    tables: ["notifications"],
    dangerous: false,
  },
  {
    id: "cart_wishlist",
    label: "Cart & Wishlist",
    description: "Clear all shopping carts and wishlists",
    tables: ["cart", "wishlist"],
    dangerous: false,
  },
  {
    id: "link_tracking",
    label: "Link Tracking & Analytics",
    description: "Reset all link tracking data and ad impressions",
    tables: ["link_tracking", "ad_impressions", "user_interactions", "user_ad_preferences"],
    dangerous: false,
  },
];

const userResetOptions = [
  { id: "wallet", label: "Wallet (Diamonds, Gems, Credits)", table: "treasure_wallet" },
  { id: "commissions", label: "Commissions Earned", table: "commissions" },
  { id: "leadership_commissions", label: "Leadership Commissions", table: "leadership_commissions" },
  { id: "affiliate_rank", label: "Affiliate Rank & History", tables: ["affiliate_current_rank", "affiliate_rank_history", "affiliate_monthly_sales"] },
  { id: "orders", label: "Orders Placed", table: "orders" },
  { id: "food_orders", label: "Food Orders", table: "food_orders" },
  { id: "credit_purchases", label: "Credit Purchases", table: "credit_purchases" },
  { id: "payout_requests", label: "Payout Requests", table: "payout_requests" },
  { id: "game_progress", label: "Game Progress", tables: ["game_level_completions", "moba_level_completions", "moba_player_progress", "moba_player_heroes"] },
  { id: "notifications", label: "Notifications", table: "notifications" },
  { id: "cart", label: "Shopping Cart", table: "cart" },
  { id: "wishlist", label: "Wishlist", table: "wishlist" },
];

export default function SystemResetManagement() {
  const [activeTab, setActiveTab] = useState("system");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Individual user reset states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUserOptions, setSelectedUserOptions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserConfirmDialog, setShowUserConfirmDialog] = useState(false);
  const [userConfirmText, setUserConfirmText] = useState("");

  const handleToggleOption = (optionId: string) => {
    setSelectedOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOptions.length === resetOptions.length) {
      setSelectedOptions([]);
    } else {
      setSelectedOptions(resetOptions.map((opt) => opt.id));
    }
  };

  // Export data to CSV
  const exportDataToCSV = async () => {
    if (selectedOptions.length === 0) {
      toast.error("Please select data categories to export");
      return;
    }

    setIsExporting(true);
    try {
      const exportData: { [key: string]: any[] } = {};
      const selectedTables = selectedOptions.flatMap(
        (optId) => resetOptions.find((opt) => opt.id === optId)?.tables || []
      );
      const uniqueTables = [...new Set(selectedTables)];

      for (const table of uniqueTables) {
        try {
          const { data, error } = await supabase
            .from(table as any)
            .select("*")
            .limit(10000);

          if (!error && data) {
            exportData[table] = data;
          }
        } catch (err) {
          console.error(`Error fetching ${table}:`, err);
        }
      }

      // Create CSV files for each table
      const timestamp = new Date().toISOString().split("T")[0];
      
      for (const [tableName, data] of Object.entries(exportData)) {
        if (data.length === 0) continue;

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(","),
          ...data.map((row) =>
            headers.map((h) => {
              const value = row[h];
              if (value === null || value === undefined) return "";
              if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${tableName}_backup_${timestamp}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      toast.success(`Exported ${Object.keys(exportData).length} tables to CSV files`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    if (confirmText !== "RESET") {
      toast.error("Please type RESET to confirm");
      return;
    }

    setIsResetting(true);
    setShowConfirmDialog(false);

    try {
      const selectedTables = selectedOptions.flatMap(
        (optId) => resetOptions.find((opt) => opt.id === optId)?.tables || []
      );
      const uniqueTables = [...new Set(selectedTables)];

      let successCount = 0;
      let errorCount = 0;

      for (const table of uniqueTables) {
        try {
          if (table === "treasure_wallet") {
            const { error } = await supabase
              .from("treasure_wallet")
              .update({ diamonds: 0, gems: 0, credits: 0, updated_at: new Date().toISOString() })
              .neq("user_id", "00000000-0000-0000-0000-000000000000");
            
            if (error) {
              console.error(`Error resetting ${table}:`, error);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            const { error } = await supabase
              .from(table as any)
              .delete()
              .neq("id", "00000000-0000-0000-0000-000000000000");
            
            if (error) {
              console.error(`Error clearing ${table}:`, error);
              errorCount++;
            } else {
              successCount++;
            }
          }
        } catch (err) {
          console.error(`Exception clearing ${table}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully reset ${successCount} tables!`);
      } else {
        toast.warning(`Reset completed with ${errorCount} errors. ${successCount} tables cleared successfully.`);
      }

      setSelectedOptions([]);
      setConfirmText("");
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("An error occurred during reset");
    } finally {
      setIsResetting(false);
    }
  };

  // Search users
  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, referral_code")
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,referral_code.ilike.%${searchQuery}%`)
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
      
      if (!data || data.length === 0) {
        toast.info("No users found matching your search");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const selectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedUserOptions([]);
  };

  const handleToggleUserOption = (optionId: string) => {
    setSelectedUserOptions((prev) =>
      prev.includes(optionId)
        ? prev.filter((id) => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSelectAllUserOptions = () => {
    if (selectedUserOptions.length === userResetOptions.length) {
      setSelectedUserOptions([]);
    } else {
      setSelectedUserOptions(userResetOptions.map((opt) => opt.id));
    }
  };

  // Export individual user data
  const exportUserData = async () => {
    if (!selectedUser || selectedUserOptions.length === 0) {
      toast.error("Please select a user and data to export");
      return;
    }

    setIsExporting(true);
    try {
      const exportData: { [key: string]: any[] } = {};
      const timestamp = new Date().toISOString().split("T")[0];

      for (const optId of selectedUserOptions) {
        const option = userResetOptions.find((o) => o.id === optId);
        if (!option) continue;

        const tables = 'tables' in option ? option.tables : [option.table];
        
        for (const table of tables) {
          try {
            const userIdColumn = table === "treasure_wallet" || table === "affiliate_current_rank" 
              ? "user_id" 
              : table === "orders" || table === "food_orders" 
                ? "customer_id" 
                : "user_id";

            const { data, error } = await supabase
              .from(table as any)
              .select("*")
              .eq(userIdColumn, selectedUser.id);

            if (!error && data && data.length > 0) {
              exportData[table] = data;
            }
          } catch (err) {
            console.error(`Error fetching ${table}:`, err);
          }
        }
      }

      for (const [tableName, data] of Object.entries(exportData)) {
        if (data.length === 0) continue;

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(","),
          ...data.map((row) =>
            headers.map((h) => {
              const value = row[h];
              if (value === null || value === undefined) return "";
              if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              return `"${String(value).replace(/"/g, '""')}"`;
            }).join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${selectedUser.full_name || selectedUser.id}_${tableName}_${timestamp}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
      }

      toast.success(`Exported user data to CSV files`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export user data");
    } finally {
      setIsExporting(false);
    }
  };

  // Reset individual user data
  const handleUserReset = async () => {
    if (userConfirmText !== "RESET" || !selectedUser) {
      toast.error("Please type RESET to confirm");
      return;
    }

    setIsResetting(true);
    setShowUserConfirmDialog(false);

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const optId of selectedUserOptions) {
        const option = userResetOptions.find((o) => o.id === optId);
        if (!option) continue;

        const tables = 'tables' in option ? option.tables : [option.table];

        for (const table of tables) {
          try {
            const userIdColumn = table === "treasure_wallet" || table === "affiliate_current_rank"
              ? "user_id"
              : table === "orders" || table === "food_orders"
                ? "customer_id"
                : "user_id";

            if (table === "treasure_wallet") {
              const { error } = await supabase
                .from("treasure_wallet")
                .update({ diamonds: 0, gems: 0, credits: 0, updated_at: new Date().toISOString() })
                .eq("user_id", selectedUser.id);

              if (error) {
                console.error(`Error resetting ${table}:`, error);
                errorCount++;
              } else {
                successCount++;
              }
            } else if (table === "affiliate_current_rank") {
              const { error } = await supabase
                .from("affiliate_current_rank")
                .update({ current_step: 0, qualification_count: 0, is_fixed: false, updated_at: new Date().toISOString() })
                .eq("user_id", selectedUser.id);

              if (error) {
                console.error(`Error resetting ${table}:`, error);
                errorCount++;
              } else {
                successCount++;
              }
            } else {
              const { error } = await supabase
                .from(table as any)
                .delete()
                .eq(userIdColumn, selectedUser.id);

              if (error) {
                console.error(`Error clearing ${table}:`, error);
                errorCount++;
              } else {
                successCount++;
              }
            }
          } catch (err) {
            console.error(`Exception clearing ${table}:`, err);
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        toast.success(`Successfully reset ${successCount} data categories for ${selectedUser.full_name || "user"}!`);
      } else {
        toast.warning(`Reset completed with ${errorCount} errors.`);
      }

      setSelectedUserOptions([]);
      setUserConfirmText("");
    } catch (error) {
      console.error("Reset error:", error);
      toast.error("An error occurred during reset");
    } finally {
      setIsResetting(false);
    }
  };

  const dangerousSelected = selectedOptions.some(
    (optId) => resetOptions.find((opt) => opt.id === optId)?.dangerous
  );

  return (
    <div className="space-y-6 pb-24">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            System Reset
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <User className="w-4 h-4" />
            Individual User Reset
          </TabsTrigger>
        </TabsList>

        {/* System-wide Reset Tab */}
        <TabsContent value="system">
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
                <div>
                  <CardTitle className="text-destructive">System Reset</CardTitle>
                  <CardDescription>
                    Permanently delete selected data from the system. Download backup first!
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b">
                <Label className="text-sm font-medium">Select data to reset:</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportDataToCSV}
                    disabled={selectedOptions.length === 0 || isExporting}
                    className="gap-2"
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Export Selected to CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedOptions.length === resetOptions.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </div>

              {/* Reset Options Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {resetOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                      selectedOptions.includes(option.id)
                        ? option.dangerous
                          ? "border-destructive bg-destructive/5"
                          : "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <Checkbox
                      id={option.id}
                      checked={selectedOptions.includes(option.id)}
                      onCheckedChange={() => handleToggleOption(option.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={option.id}
                        className="font-medium cursor-pointer flex items-center gap-2"
                      >
                        {option.label}
                        {option.dangerous && (
                          <span className="text-xs px-1.5 py-0.5 bg-destructive/20 text-destructive rounded">
                            Critical
                          </span>
                        )}
                      </Label>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Summary */}
              {selectedOptions.length > 0 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">
                    Selected: {selectedOptions.length} of {resetOptions.length} categories
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tables to be cleared:{" "}
                    {selectedOptions
                      .flatMap((optId) => resetOptions.find((opt) => opt.id === optId)?.tables || [])
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .join(", ")}
                  </p>
                </div>
              )}

              {/* Reset Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedOptions.length === 0 || isResetting}
                  onClick={() => setShowConfirmDialog(true)}
                  className="gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Reset Selected Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual User Reset Tab */}
        <TabsContent value="individual">
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-destructive" />
                <div>
                  <CardTitle className="text-destructive">Individual User Reset</CardTitle>
                  <CardDescription>
                    Search for a user and reset specific data categories for that user only.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* User Search */}
              <div className="space-y-4">
                <Label>Search User (by name, email, or referral code):</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter name, email, or referral code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                    className="flex-1"
                  />
                  <Button onClick={searchUsers} disabled={isSearching} className="gap-2">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Search
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Referral Code</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {searchResults.map((user) => (
                        <TableRow
                          key={user.id}
                          className={selectedUser?.id === user.id ? "bg-primary/10" : ""}
                        >
                          <TableCell>{user.full_name || "N/A"}</TableCell>
                          <TableCell>{user.email || "N/A"}</TableCell>
                          <TableCell>{user.referral_code || "N/A"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={selectedUser?.id === user.id ? "default" : "outline"}
                              onClick={() => selectUser(user)}
                            >
                              {selectedUser?.id === user.id ? "Selected" : "Select"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* User Data Reset Options */}
              {selectedUser && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Label className="text-sm font-medium">
                        Reset data for: <span className="text-primary">{selectedUser.full_name || selectedUser.email}</span>
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportUserData}
                        disabled={selectedUserOptions.length === 0 || isExporting}
                        className="gap-2"
                      >
                        {isExporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Export to CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleSelectAllUserOptions}>
                        {selectedUserOptions.length === userResetOptions.length ? "Deselect All" : "Select All"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {userResetOptions.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                          selectedUserOptions.includes(option.id)
                            ? "border-destructive bg-destructive/5"
                            : "border-border hover:border-muted-foreground/50"
                        }`}
                      >
                        <Checkbox
                          id={`user-${option.id}`}
                          checked={selectedUserOptions.includes(option.id)}
                          onCheckedChange={() => handleToggleUserOption(option.id)}
                        />
                        <Label htmlFor={`user-${option.id}`} className="cursor-pointer text-sm">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {selectedUserOptions.length > 0 && (
                    <div className="flex justify-end pt-4">
                      <Button
                        variant="destructive"
                        disabled={isResetting}
                        onClick={() => setShowUserConfirmDialog(true)}
                        className="gap-2"
                      >
                        {isResetting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Reset User Data
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* System Reset Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm System Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to permanently delete data from{" "}
                <strong>{selectedOptions.length}</strong> categories. This action{" "}
                <strong>cannot be undone</strong>.
              </p>
              {dangerousSelected && (
                <p className="text-destructive font-medium">
                  ⚠️ You have selected critical data that may affect user balances, earnings, and transaction history.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                💡 Tip: Export your data to CSV before resetting to keep a backup record.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-reset" className="text-sm">
                  Type <strong>RESET</strong> to confirm:
                </Label>
                <Input
                  id="confirm-reset"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type RESET"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={confirmText !== "RESET"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Individual User Reset Confirmation Dialog */}
      <AlertDialog open={showUserConfirmDialog} onOpenChange={setShowUserConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Confirm User Data Reset
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to reset <strong>{selectedUserOptions.length}</strong> data categories for user{" "}
                <strong>{selectedUser?.full_name || selectedUser?.email}</strong>.
              </p>
              <p className="text-destructive font-medium">
                ⚠️ This will permanently delete or reset the selected data for this user only.
              </p>
              <p className="text-sm text-muted-foreground">
                💡 Tip: Export user data to CSV before resetting to keep a backup record.
              </p>
              <div className="pt-2">
                <Label htmlFor="user-confirm-reset" className="text-sm">
                  Type <strong>RESET</strong> to confirm:
                </Label>
                <Input
                  id="user-confirm-reset"
                  value={userConfirmText}
                  onChange={(e) => setUserConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type RESET"
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUserReset}
              disabled={userConfirmText !== "RESET"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset User Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
