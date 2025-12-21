import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, DollarSign, Users, Percent, PieChart, Sparkles, GitBranch, ShoppingCart, UtensilsCrossed, Calendar, Store, Building2, Layers, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/currencies";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesData {
  // Revenue Sources
  totalSales: number;
  productSales: number;
  foodOrderSales: number;
  bookingSales: number;
  marketplaceSales: number;
  creditCashins: number;
  diamondCashins: number;
  aiCreditPurchases: number;
  
  // Commission Payouts
  unilevelPayouts: number;
  stairstepPayouts: number;
  breakawayPayouts: number;
  binaryPayouts: number;
  leadershipPayouts: number;
  totalCommissions: number;
  
  // Costs
  aiCreditCosts: number;
  
  // Profits
  netProfit: number;
  aiCreditAdminProfit: number;
  aiCreditAffiliatePool: number;
}

interface DepartmentSales {
  name: string;
  amount: number;
  color: string;
  icon: React.ReactNode;
  percentage: number;
}

export const SalesAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    productSales: 0,
    foodOrderSales: 0,
    bookingSales: 0,
    marketplaceSales: 0,
    creditCashins: 0,
    diamondCashins: 0,
    aiCreditPurchases: 0,
    unilevelPayouts: 0,
    stairstepPayouts: 0,
    breakawayPayouts: 0,
    binaryPayouts: 0,
    leadershipPayouts: 0,
    totalCommissions: 0,
    aiCreditCosts: 0,
    netProfit: 0,
    aiCreditAdminProfit: 0,
    aiCreditAffiliatePool: 0,
  });

  useEffect(() => {
    fetchSalesAnalytics();

    // Real-time subscriptions
    const channels = [
      supabase.channel('sales-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-food-orders').on('postgres_changes', { event: '*', schema: 'public', table: 'food_orders' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-bookings').on('postgres_changes', { event: '*', schema: 'public', table: 'service_bookings' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-marketplace').on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_inquiries' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-commissions').on('postgres_changes', { event: '*', schema: 'public', table: 'commissions' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-binary').on('postgres_changes', { event: '*', schema: 'public', table: 'binary_commissions' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-ai').on('postgres_changes', { event: '*', schema: 'public', table: 'binary_ai_purchases' }, () => fetchSalesAnalytics()).subscribe(),
      supabase.channel('sales-leadership').on('postgres_changes', { event: '*', schema: 'public', table: 'leadership_commissions' }, () => fetchSalesAnalytics()).subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const fetchSalesAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch product sales (delivered orders from shop)
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("status", "delivered");
      const productSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Fetch food order sales (delivered)
      const { data: foodOrders } = await supabase
        .from("food_orders")
        .select("total_amount")
        .eq("status", "delivered");
      const foodOrderSales = foodOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Fetch booking sales (completed) - simplified
      const { data: bookings } = await supabase
        .from("service_bookings")
        .select("id")
        .eq("status", "completed");
      const bookingSales = (bookings?.length || 0) * 500; // Estimate avg booking value

      // Fetch marketplace sales (completed inquiries with price)
      const { data: marketplaceInquiries } = await supabase
        .from("marketplace_inquiries")
        .select("listing_id")
        .eq("status", "accepted");
      
      let marketplaceSales = 0;
      if (marketplaceInquiries && marketplaceInquiries.length > 0) {
        const listingIds = marketplaceInquiries.map(i => i.listing_id);
        const { data: listings } = await supabase
          .from("marketplace_listings")
          .select("price")
          .in("id", listingIds);
        marketplaceSales = listings?.reduce((sum, listing) => sum + Number(listing.price || 0), 0) || 0;
      }

      // Fetch credit purchases (approved)
      const { data: creditPurchases } = await supabase
        .from("credit_purchases")
        .select("amount")
        .eq("status", "approved");
      const creditCashins = creditPurchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch diamond transactions (completed)
      const { data: diamondTxns } = await supabase
        .from("diamond_transactions")
        .select("total_price")
        .eq("status", "completed");
      const diamondCashins = diamondTxns?.reduce((sum, txn) => sum + Number(txn.total_price), 0) || 0;

      // Fetch AI Credit purchases (approved)
      const { data: aiPurchases } = await supabase
        .from("binary_ai_purchases")
        .select("amount, credits_received")
        .eq("status", "approved");
      const aiCreditPurchases = aiPurchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch commissions by type
      const { data: commissions } = await supabase
        .from("commissions")
        .select("amount, commission_type, level");

      const unilevelPayouts = commissions?.filter(c => c.commission_type === "purchase" && c.level >= 1 && c.level <= 7)
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const stairstepPayouts = commissions?.filter(c => c.commission_type === "stair_step")
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const breakawayPayouts = commissions?.filter(c => c.commission_type === "breakaway")
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Fetch binary commissions
      const { data: binaryCommissions } = await supabase
        .from("binary_commissions")
        .select("amount");
      const binaryPayouts = binaryCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Fetch leadership commissions
      const { data: leadershipCommissions } = await supabase
        .from("leadership_commissions")
        .select("amount");
      const leadershipPayouts = leadershipCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Fetch AI settings for cost calculation
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("key, value")
        .or("key.eq.binary_admin_safety_net,key.like.ai_credit_tier_%,key.eq.binary_selected_tier_index");

      let adminSafetyNet = 35;
      let selectedTierIndex = 0;
      let tierCost = 0;

      if (settingsData) {
        const safetyNetSetting = settingsData.find(s => s.key === 'binary_admin_safety_net');
        if (safetyNetSetting) adminSafetyNet = parseFloat(safetyNetSetting.value || '35');

        const tierIndexSetting = settingsData.find(s => s.key === 'binary_selected_tier_index');
        if (tierIndexSetting) selectedTierIndex = parseInt(tierIndexSetting.value || '0');

        const tierCostSetting = settingsData.find(s => s.key === `ai_credit_tier_${selectedTierIndex + 1}_cost`);
        if (tierCostSetting) tierCost = parseFloat(tierCostSetting.value || '0');
      }

      const purchaseCount = aiPurchases?.length || 0;
      const aiCreditCosts = tierCost * purchaseCount;
      const adminKeepsTotal = (aiCreditPurchases * adminSafetyNet) / 100;
      const aiCreditAdminProfit = Math.max(0, adminKeepsTotal - aiCreditCosts);
      const aiCreditAffiliatePool = Math.max(0, aiCreditPurchases - aiCreditCosts - aiCreditAdminProfit);

      const totalCommissions = unilevelPayouts + stairstepPayouts + breakawayPayouts + binaryPayouts + leadershipPayouts;
      const totalSales = productSales + foodOrderSales + bookingSales + marketplaceSales + creditCashins + diamondCashins + aiCreditPurchases;
      const netProfit = totalSales - totalCommissions - aiCreditCosts;

      setSalesData({
        totalSales,
        productSales,
        foodOrderSales,
        bookingSales,
        marketplaceSales,
        creditCashins,
        diamondCashins,
        aiCreditPurchases,
        unilevelPayouts,
        stairstepPayouts,
        breakawayPayouts,
        binaryPayouts,
        leadershipPayouts,
        totalCommissions,
        aiCreditCosts,
        netProfit,
        aiCreditAdminProfit,
        aiCreditAffiliatePool,
      });
    } catch (error: any) {
      console.error("Error fetching sales analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const departmentSales: DepartmentSales[] = [
    { name: "Shop Products", amount: salesData.productSales, color: "from-blue-500 to-cyan-500", icon: <ShoppingCart className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.productSales / salesData.totalSales) * 100 : 0 },
    { name: "Food Delivery", amount: salesData.foodOrderSales, color: "from-orange-500 to-red-500", icon: <UtensilsCrossed className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.foodOrderSales / salesData.totalSales) * 100 : 0 },
    { name: "Bookings", amount: salesData.bookingSales, color: "from-emerald-500 to-teal-500", icon: <Calendar className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.bookingSales / salesData.totalSales) * 100 : 0 },
    { name: "Marketplace", amount: salesData.marketplaceSales, color: "from-purple-500 to-pink-500", icon: <Store className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.marketplaceSales / salesData.totalSales) * 100 : 0 },
    { name: "Credit Cash-ins", amount: salesData.creditCashins, color: "from-amber-500 to-yellow-500", icon: <Wallet className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.creditCashins / salesData.totalSales) * 100 : 0 },
    { name: "Diamond Cash-ins", amount: salesData.diamondCashins, color: "from-cyan-500 to-blue-500", icon: <Sparkles className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.diamondCashins / salesData.totalSales) * 100 : 0 },
    { name: "AI Credits", amount: salesData.aiCreditPurchases, color: "from-violet-500 to-purple-500", icon: <GitBranch className="w-5 h-5" />, percentage: salesData.totalSales > 0 ? (salesData.aiCreditPurchases / salesData.totalSales) * 100 : 0 },
  ];

  const commissionBreakdown = [
    { name: "Unilevel (7-Level)", amount: salesData.unilevelPayouts, color: "from-blue-500 to-indigo-500", percentage: salesData.totalCommissions > 0 ? (salesData.unilevelPayouts / salesData.totalCommissions) * 100 : 0 },
    { name: "Stair-Step", amount: salesData.stairstepPayouts, color: "from-purple-500 to-pink-500", percentage: salesData.totalCommissions > 0 ? (salesData.stairstepPayouts / salesData.totalCommissions) * 100 : 0 },
    { name: "Breakaway", amount: salesData.breakawayPayouts, color: "from-orange-500 to-red-500", percentage: salesData.totalCommissions > 0 ? (salesData.breakawayPayouts / salesData.totalCommissions) * 100 : 0 },
    { name: "Binary Affiliate", amount: salesData.binaryPayouts, color: "from-cyan-500 to-teal-500", percentage: salesData.totalCommissions > 0 ? (salesData.binaryPayouts / salesData.totalCommissions) * 100 : 0 },
    { name: "Leadership Override", amount: salesData.leadershipPayouts, color: "from-emerald-500 to-green-500", percentage: salesData.totalCommissions > 0 ? (salesData.leadershipPayouts / salesData.totalCommissions) * 100 : 0 },
  ];

  const profitPercentage = salesData.totalSales > 0 ? (salesData.netProfit / salesData.totalSales) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <TrendingUp className="h-6 w-6" />
            </div>
            Complete Sales Analytics
          </CardTitle>
          <CardDescription className="text-white/80">
            Full revenue breakdown from all departments with commission distribution
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Total Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(salesData.totalSales, "PHP")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Total Commissions</p>
              <p className="text-3xl font-bold text-amber-300">-{formatCurrency(salesData.totalCommissions, "PHP")}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-white/70 text-sm">Net Profit</p>
              <p className={`text-3xl font-bold ${salesData.netProfit >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {formatCurrency(salesData.netProfit, "PHP")}
              </p>
              <Badge className={`mt-1 ${salesData.netProfit >= 0 ? 'bg-emerald-500/30 text-emerald-200' : 'bg-red-500/30 text-red-200'}`}>
                {profitPercentage.toFixed(1)}% margin
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
          <TabsTrigger value="departments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Commissions
          </TabsTrigger>
          <TabsTrigger value="ai-credits" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
            <GitBranch className="w-4 h-4 mr-2" />
            AI Credits
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            <Layers className="w-4 h-4 mr-2" />
            Breakdown
          </TabsTrigger>
        </TabsList>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Sales by Department
                </span>
              </CardTitle>
              <CardDescription>Revenue breakdown from each department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {departmentSales.map((dept, index) => (
                  <Card key={index} className={`bg-gradient-to-br ${dept.color.replace('from-', 'from-').replace('to-', 'to-')}/10 border-0 overflow-hidden`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${dept.color} text-white`}>
                          {dept.icon}
                        </div>
                        <p className="text-sm font-medium">{dept.name}</p>
                      </div>
                      <p className={`text-2xl font-bold bg-gradient-to-r ${dept.color} bg-clip-text text-transparent`}>
                        {formatCurrency(dept.amount, "PHP")}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${dept.color} transition-all duration-500`}
                            style={{ width: `${dept.percentage}%` }}
                          />
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {dept.percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5 border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <PieChart className="w-5 h-5 text-orange-600" />
                <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Commission Distribution
                </span>
              </CardTitle>
              <CardDescription>Breakdown of all affiliate commission payouts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                {commissionBreakdown.map((comm, index) => (
                  <Card key={index} className={`bg-gradient-to-br ${comm.color.replace('from-', 'from-').replace('to-', 'to-')}/10 border-0`}>
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">{comm.name}</p>
                      <p className={`text-xl font-bold bg-gradient-to-r ${comm.color} bg-clip-text text-transparent`}>
                        {formatCurrency(comm.amount, "PHP")}
                      </p>
                      <Badge variant="outline" className="mt-2 text-xs">
                        <Percent className="w-3 h-3 mr-1" />
                        {comm.percentage.toFixed(1)}%
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-amber-600" />
                      <p className="font-semibold">Total Commission Payouts</p>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{formatCurrency(salesData.totalCommissions, "PHP")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {salesData.totalSales > 0 ? ((salesData.totalCommissions / salesData.totalSales) * 100).toFixed(2) : 0}% of total revenue
                  </p>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Credits Tab */}
        <TabsContent value="ai-credits" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitBranch className="w-5 h-5 text-violet-600" />
                <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                  AI Credit (Binary Affiliate) Cashflow
                </span>
              </CardTitle>
              <CardDescription>Complete breakdown of AI credit purchase money flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      <p className="text-xs font-medium text-muted-foreground">Total AI Credit Purchases</p>
                    </div>
                    <p className="text-xl font-bold text-violet-600">{formatCurrency(salesData.aiCreditPurchases, "PHP")}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
                  <CardContent className="pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">AI Service Costs</p>
                    <p className="text-xl font-bold text-orange-600">-{formatCurrency(salesData.aiCreditCosts, "PHP")}</p>
                    <p className="text-xs text-muted-foreground mt-1">API costs to providers</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30">
                  <CardContent className="pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Admin Net Profit</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(salesData.aiCreditAdminProfit, "PHP")}</p>
                    <p className="text-xs text-muted-foreground mt-1">After AI costs</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
                  <CardContent className="pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Binary Affiliate Pool</p>
                    <p className="text-xl font-bold text-cyan-600">{formatCurrency(salesData.aiCreditAffiliatePool, "PHP")}</p>
                    <p className="text-xs text-muted-foreground mt-1">Available for payouts</p>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 bg-background/50 rounded-lg border">
                <h5 className="font-medium mb-3 text-sm">AI Credit Cashflow Formula</h5>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span>Total AI Credit Purchases</span>
                    <span className="font-medium">{formatCurrency(salesData.aiCreditPurchases, "PHP")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-orange-600">
                    <span className="pl-4">- AI Service Costs</span>
                    <span>({formatCurrency(salesData.aiCreditCosts, "PHP")})</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-600">
                    <span className="pl-4">- Admin Profit</span>
                    <span>({formatCurrency(salesData.aiCreditAdminProfit, "PHP")})</span>
                  </div>
                  <div className="flex justify-between py-2 border-t font-semibold text-cyan-600">
                    <span>= Binary Affiliate Pool</span>
                    <span>{formatCurrency(salesData.aiCreditAffiliatePool, "PHP")}</span>
                  </div>
                  <div className="flex justify-between py-1 text-amber-600">
                    <span className="pl-4">- Paid to Affiliates</span>
                    <span>({formatCurrency(salesData.binaryPayouts, "PHP")})</span>
                  </div>
                  <div className={`flex justify-between py-2 border-t font-semibold ${(salesData.aiCreditAffiliatePool - salesData.binaryPayouts) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    <span>= Pool Remaining</span>
                    <span>{formatCurrency(salesData.aiCreditAffiliatePool - salesData.binaryPayouts, "PHP")}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4 mt-4">
          <Card className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="w-5 h-5 text-emerald-600" />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Complete Accounting Breakdown
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {/* Revenue Section */}
                <div className="bg-blue-500/10 p-3 rounded-lg mb-4">
                  <h5 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Revenue Sources
                  </h5>
                  {departmentSales.map((dept, index) => (
                    <div key={index} className="flex justify-between py-1.5 border-b border-blue-500/10 last:border-0">
                      <span className="flex items-center gap-2">
                        {dept.icon}
                        {dept.name}
                      </span>
                      <span className="font-medium">{formatCurrency(dept.amount, "PHP")}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 mt-2 font-bold text-lg border-t border-blue-500/30">
                    <span>Total Revenue</span>
                    <span className="text-blue-600">{formatCurrency(salesData.totalSales, "PHP")}</span>
                  </div>
                </div>

                {/* Deductions Section */}
                <div className="bg-amber-500/10 p-3 rounded-lg mb-4">
                  <h5 className="font-semibold text-amber-600 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Commission Deductions
                  </h5>
                  {commissionBreakdown.map((comm, index) => (
                    <div key={index} className="flex justify-between py-1.5 border-b border-amber-500/10 last:border-0 text-muted-foreground">
                      <span className="pl-4">- {comm.name}</span>
                      <span>({formatCurrency(comm.amount, "PHP")})</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 border-b border-amber-500/10 text-muted-foreground">
                    <span className="pl-4">- AI Service Costs</span>
                    <span>({formatCurrency(salesData.aiCreditCosts, "PHP")})</span>
                  </div>
                  <div className="flex justify-between py-2 mt-2 font-bold text-lg border-t border-amber-500/30">
                    <span>Total Deductions</span>
                    <span className="text-amber-600">({formatCurrency(salesData.totalCommissions + salesData.aiCreditCosts, "PHP")})</span>
                  </div>
                </div>

                {/* Net Profit */}
                <div className={`p-4 rounded-lg ${salesData.netProfit >= 0 ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20' : 'bg-gradient-to-r from-red-500/20 to-orange-500/20'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-6 h-6 ${salesData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                      <span className="font-bold text-lg">Net Profit</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${salesData.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(salesData.netProfit, "PHP")}
                      </p>
                      <Badge className={`${salesData.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-700' : 'bg-red-500/20 text-red-700'}`}>
                        {profitPercentage.toFixed(2)}% profit margin
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Net Profit Formula:</p>
                  <p className="text-sm font-mono">
                    {formatCurrency(salesData.totalSales, "PHP")} - {formatCurrency(salesData.totalCommissions, "PHP")} - {formatCurrency(salesData.aiCreditCosts, "PHP")} = {formatCurrency(salesData.netProfit, "PHP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};