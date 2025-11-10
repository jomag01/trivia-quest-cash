import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Gem, ShoppingCart, Store, TrendingUp, Coins, History, Filter, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Listing {
  id: string;
  seller_id: string;
  diamond_amount: number;
  price_per_diamond: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface TreasureWallet {
  gems: number;
  diamonds: number;
}

interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  diamond_amount: number;
  total_price: number;
  transaction_type: string;
  status: string;
  created_at: string;
}

export default function DiamondMarketplace() {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [treasureWallet, setTreasureWallet] = useState<TreasureWallet>({ gems: 0, diamonds: 0 });
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sellAmount, setSellAmount] = useState("");
  const [pricePerDiamond, setPricePerDiamond] = useState("");
  const [baseDiamondPrice, setBaseDiamondPrice] = useState(10);
  const [gemToDiamondRatio, setGemToDiamondRatio] = useState(100);
  const [convertGemAmount, setConvertGemAmount] = useState("");
  
  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [listingsRes, myListingsRes, transactionsRes, treasureWalletRes, settingsRes] = await Promise.all([
        supabase.from("diamond_marketplace").select("*").eq("status", "active").order("created_at", { ascending: false }),
        supabase.from("diamond_marketplace").select("*").eq("seller_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("diamond_transactions").select("*").or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`).order("created_at", { ascending: false }),
        supabase.from("treasure_wallet").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("treasure_admin_settings").select("*").in("setting_key", ["diamond_base_price", "gem_to_diamond_ratio"]),
      ]);

      if (listingsRes.error) throw listingsRes.error;
      if (myListingsRes.error) throw myListingsRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setListings(listingsRes.data || []);
      setMyListings(myListingsRes.data || []);
      setTransactions(transactionsRes.data || []);
      
      // Fetch wallet separately with explicit type casting
      const walletQuery = await supabase
        .from("wallet" as any)
        .select("credits")
        .eq("user_id", user!.id)
        .maybeSingle();
      
      setWallet(walletQuery.data || { credits: 0 });

      if (treasureWalletRes.data) {
        setTreasureWallet(treasureWalletRes.data);
      } else {
        // Create wallet if it doesn't exist
        const { data: newWallet } = await supabase
          .from("treasure_wallet")
          .insert([{ user_id: user!.id, gems: 0, diamonds: 0 }])
          .select()
          .single();
        if (newWallet) setTreasureWallet({ gems: newWallet.gems, diamonds: newWallet.diamonds });
      }

      if (settingsRes.data) {
        const basePrice = settingsRes.data.find((s) => s.setting_key === "diamond_base_price");
        const ratio = settingsRes.data.find((s) => s.setting_key === "gem_to_diamond_ratio");
        if (basePrice) setBaseDiamondPrice(parseFloat(basePrice.setting_value));
        if (ratio) setGemToDiamondRatio(parseInt(ratio.setting_value));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load marketplace data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async () => {
    const amount = parseInt(sellAmount);
    const price = parseFloat(pricePerDiamond);

    if (!amount || !price || amount <= 0 || price <= 0) {
      toast.error("Please enter valid amounts");
      return;
    }

    if (amount > treasureWallet.diamonds) {
      toast.error("Insufficient diamonds");
      return;
    }

    try {
      // Deduct diamonds from wallet
      const { error: walletError } = await supabase
        .from("treasure_wallet")
        .update({ diamonds: treasureWallet.diamonds - amount })
        .eq("user_id", user!.id);

      if (walletError) throw walletError;

      // Create listing
      const { error: listingError } = await supabase.from("diamond_marketplace").insert([
        {
          seller_id: user!.id,
          diamond_amount: amount,
          price_per_diamond: price,
          total_price: amount * price,
          status: "active",
        },
      ]);

      if (listingError) throw listingError;

      toast.success(`Listed ${amount} diamonds for sale!`);
      setSellAmount("");
      setPricePerDiamond("");
      fetchData();
    } catch (error) {
      console.error("Error creating listing:", error);
      toast.error("Failed to create listing");
    }
  };

  const handleCancelListing = async (listingId: string, diamondAmount: number) => {
    try {
      // Return diamonds to wallet
      const { error: walletError } = await supabase
        .from("treasure_wallet")
        .update({ diamonds: treasureWallet.diamonds + diamondAmount })
        .eq("user_id", user!.id);

      if (walletError) throw walletError;

      // Update listing status
      const { error: listingError } = await supabase
        .from("diamond_marketplace")
        .update({ status: "cancelled" })
        .eq("id", listingId);

      if (listingError) throw listingError;

      toast.success("Listing cancelled");
      fetchData();
    } catch (error) {
      console.error("Error cancelling listing:", error);
      toast.error("Failed to cancel listing");
    }
  };

  const handleBuyDiamonds = async (listing: Listing) => {
    if (!wallet || wallet.credits < listing.total_price) {
      toast.error("Insufficient credits");
      return;
    }

    try {
      // Deduct credits from buyer using RPC function
      const { error: buyerWalletError } = await supabase.rpc("update_credits", {
        user_id: user!.id,
        amount: -listing.total_price,
      });

      if (buyerWalletError) throw buyerWalletError;

      // Add credits to seller
      const { error: sellerWalletError } = await supabase.rpc("increment_credits", {
        user_id: listing.seller_id,
        amount: listing.total_price,
      });

      if (sellerWalletError) throw sellerWalletError;

      // Add diamonds to buyer
      const { error: diamondError } = await supabase.rpc("update_treasure_wallet", {
        p_user_id: user!.id,
        p_gems: 0,
        p_diamonds: listing.diamond_amount,
      });

      if (diamondError) throw diamondError;

      // Update listing status
      const { error: listingError } = await supabase
        .from("diamond_marketplace")
        .update({ status: "sold" })
        .eq("id", listing.id);

      if (listingError) throw listingError;

      // Create transaction record
      await supabase.from("diamond_transactions").insert([
        {
          listing_id: listing.id,
          buyer_id: user!.id,
          seller_id: listing.seller_id,
          diamond_amount: listing.diamond_amount,
          total_price: listing.total_price,
          transaction_type: "purchase",
          status: "completed",
        },
      ]);

      toast.success(`Purchased ${listing.diamond_amount} diamonds!`);
      fetchData();
    } catch (error) {
      console.error("Error buying diamonds:", error);
      toast.error("Failed to purchase diamonds");
    }
  };

  const handleConvertGemsToDiamonds = async () => {
    const gemAmount = parseInt(convertGemAmount);

    if (!gemAmount || gemAmount <= 0) {
      toast.error("Please enter valid amount");
      return;
    }

    if (gemAmount > treasureWallet.gems) {
      toast.error("Insufficient gems");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("convert_gems_to_diamonds", {
        p_user_id: user!.id,
        p_gem_amount: gemAmount,
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        toast.success(`Converted ${result.gems_used} gems to ${result.diamonds_earned} diamonds!`);
        setConvertGemAmount("");
        fetchData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error converting gems:", error);
      toast.error("Failed to convert gems");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Store className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  const currencySymbol = profile?.currency_symbol || "₱";

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    // Filter by type
    if (filterType !== "all") {
      const isBuyer = transaction.buyer_id === user?.id;
      if (filterType === "purchase" && !isBuyer) return false;
      if (filterType === "sale" && isBuyer) return false;
    }

    // Filter by status
    if (filterStatus !== "all" && transaction.status !== filterStatus) {
      return false;
    }

    // Filter by date range
    const transactionDate = new Date(transaction.created_at);
    if (startDate && transactionDate < startDate) return false;
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (transactionDate > endOfDay) return false;
    }

    return true;
  });

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const hasActiveFilters = filterType !== "all" || filterStatus !== "all" || startDate || endDate;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Store className="w-8 h-8" />
            Diamond Marketplace
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg border border-emerald-500/30">
              <div className="text-3xl font-bold">💎 {treasureWallet.gems}</div>
              <div className="text-sm text-muted-foreground">Your Gems</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg border border-blue-500/30">
              <div className="text-3xl font-bold">💠 {treasureWallet.diamonds}</div>
              <div className="text-sm text-muted-foreground">Your Diamonds</div>
            </div>
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <div className="text-2xl font-bold">{wallet?.credits || 0}</div>
              <div className="text-sm text-muted-foreground">Credits</div>
            </div>
            <div className="text-center p-4 bg-accent/20 rounded-lg">
              <div className="text-xl font-bold">
                {currencySymbol}
                {baseDiamondPrice.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Base Price/Diamond</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="marketplace" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="marketplace">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Buy Diamonds
          </TabsTrigger>
          <TabsTrigger value="sell">
            <TrendingUp className="w-4 h-4 mr-2" />
            Sell Diamonds
          </TabsTrigger>
          <TabsTrigger value="convert">
            <Coins className="w-4 h-4 mr-2" />
            Convert Gems
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Store className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No diamonds available for sale</p>
              </div>
            ) : (
              listings.map((listing) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gem className="w-5 h-5 text-blue-500" />
                      {listing.diamond_amount} Diamonds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Price per diamond:</span>
                        <span className="font-semibold">
                          {currencySymbol}
                          {listing.price_per_diamond.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-primary">
                        <span>Total:</span>
                        <span>
                          {currencySymbol}
                          {listing.total_price.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Listed {new Date(listing.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleBuyDiamonds(listing)}
                      className="w-full"
                      disabled={listing.seller_id === user?.id}
                    >
                      {listing.seller_id === user?.id ? "Your Listing" : "Buy Now"}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="sell" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Listing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sellAmount">Diamonds to Sell</Label>
                  <Input
                    id="sellAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    min="1"
                    max={treasureWallet.diamonds}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {treasureWallet.diamonds} diamonds
                  </p>
                </div>
                <div>
                  <Label htmlFor="pricePerDiamond">Price per Diamond ({currencySymbol})</Label>
                  <Input
                    id="pricePerDiamond"
                    type="number"
                    step="0.01"
                    placeholder={`Suggested: ${baseDiamondPrice.toFixed(2)}`}
                    value={pricePerDiamond}
                    onChange={(e) => setPricePerDiamond(e.target.value)}
                    min="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Base price: {currencySymbol}
                    {baseDiamondPrice.toFixed(2)}
                  </p>
                </div>
              </div>
              {sellAmount && pricePerDiamond && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <div className="text-sm">
                    <strong>Total Earnings:</strong> {currencySymbol}
                    {(parseInt(sellAmount) * parseFloat(pricePerDiamond)).toFixed(2)}
                  </div>
                </div>
              )}
              <Button onClick={handleCreateListing} className="w-full" disabled={!sellAmount || !pricePerDiamond}>
                Create Listing
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">My Listings</h3>
            {myListings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">You have no active listings</p>
                </CardContent>
              </Card>
            ) : (
              myListings.map((listing) => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">
                          💠 {listing.diamond_amount} Diamonds
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {currencySymbol}
                          {listing.price_per_diamond.toFixed(2)} per diamond • Total: {currencySymbol}
                          {listing.total_price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Status: <span className="capitalize">{listing.status}</span>
                        </div>
                      </div>
                      {listing.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelListing(listing.id, listing.diamond_amount)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="convert" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Convert Gems to Diamonds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-accent/20 rounded-lg">
                <p className="text-sm">
                  <strong>Conversion Rate:</strong> {gemToDiamondRatio} gems = 1 diamond
                </p>
              </div>
              <div>
                <Label htmlFor="convertAmount">Gems to Convert</Label>
                <Input
                  id="convertAmount"
                  type="number"
                  placeholder="Enter amount"
                  value={convertGemAmount}
                  onChange={(e) => setConvertGemAmount(e.target.value)}
                  min={gemToDiamondRatio}
                  max={treasureWallet.gems}
                  step={gemToDiamondRatio}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {treasureWallet.gems} gems
                </p>
              </div>
              {convertGemAmount && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <div className="text-sm">
                    <strong>You will receive:</strong>{" "}
                    {Math.floor(parseInt(convertGemAmount) / gemToDiamondRatio)} diamonds
                  </div>
                </div>
              )}
              <Button onClick={handleConvertGemsToDiamonds} className="w-full" disabled={!convertGemAmount}>
                Convert to Diamonds
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transaction History</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-secondary/30 rounded-lg">
                <div>
                  <Label className="text-xs mb-2">Transaction Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="purchase">Purchases</SelectItem>
                      <SelectItem value="sale">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs mb-2">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs mb-2">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        {startDate ? format(startDate, "PP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-xs mb-2">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        {endDate ? format(endDate, "PP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    {transactions.length === 0 ? "No transactions yet" : "No transactions match your filters"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map((transaction) => {
                    const isBuyer = transaction.buyer_id === user?.id;
                    const isSeller = transaction.seller_id === user?.id;
                    return (
                      <Card key={transaction.id} className={isBuyer ? "border-green-500/30" : "border-blue-500/30"}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  isBuyer ? "bg-green-500/20 text-green-600" : "bg-blue-500/20 text-blue-600"
                                }`}>
                                  {isBuyer ? "Purchase" : "Sale"}
                                </span>
                                <span className="text-sm font-semibold">
                                  💠 {transaction.diamond_amount} Diamonds
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transaction.created_at).toLocaleString()}
                              </div>
                              <div className="text-xs">
                                Status: <span className="capitalize font-semibold">{transaction.status}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-lg font-bold ${isBuyer ? "text-red-600" : "text-green-600"}`}>
                                {isBuyer ? "-" : "+"}{currencySymbol}{transaction.total_price.toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {currencySymbol}{(transaction.total_price / transaction.diamond_amount).toFixed(2)}/diamond
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
