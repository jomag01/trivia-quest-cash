import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, DollarSign, Users, Percent, PieChart } from "lucide-react";
import { formatCurrency } from "@/lib/currencies";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SalesData {
  totalSales: number;
  productSales: number;
  creditCashins: number;
  diamondCashins: number;
  unilevelPayouts: number;
  stairstepPayouts: number;
  breakawayPayouts: number;
  totalCommissions: number;
  netProfit: number;
}

export const SalesAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    productSales: 0,
    creditCashins: 0,
    diamondCashins: 0,
    unilevelPayouts: 0,
    stairstepPayouts: 0,
    breakawayPayouts: 0,
    totalCommissions: 0,
    netProfit: 0,
  });

  useEffect(() => {
    fetchSalesAnalytics();

    // Real-time subscription for orders updates
    const ordersChannel = supabase
      .channel('sales-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.delivered'
        },
        () => {
          console.log('Order delivered - refreshing sales analytics');
          fetchSalesAnalytics();
        }
      )
      .subscribe();

    // Real-time subscription for food orders
    const foodOrdersChannel = supabase
      .channel('sales-food-orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'food_orders',
          filter: 'status=eq.delivered'
        },
        () => {
          console.log('Food order delivered - refreshing sales analytics');
          fetchSalesAnalytics();
        }
      )
      .subscribe();

    // Real-time subscription for commissions
    const commissionsChannel = supabase
      .channel('sales-commissions-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commissions'
        },
        () => {
          console.log('New commission added - refreshing sales analytics');
          fetchSalesAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(foodOrdersChannel);
      supabase.removeChannel(commissionsChannel);
    };
  }, []);

  const fetchSalesAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch product sales (delivered orders)
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total_amount, payment_method")
        .eq("status", "delivered");

      if (ordersError) throw ordersError;

      const productSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      // Fetch credit purchases (approved)
      const { data: creditPurchases, error: creditError } = await supabase
        .from("credit_purchases")
        .select("amount")
        .eq("status", "approved");

      if (creditError) throw creditError;

      const creditCashins = creditPurchases?.reduce((sum, purchase) => sum + Number(purchase.amount), 0) || 0;

      // Fetch diamond transactions (completed)
      const { data: diamondTxns, error: diamondError } = await supabase
        .from("diamond_transactions")
        .select("total_price")
        .eq("status", "completed");

      if (diamondError) throw diamondError;

      const diamondCashins = diamondTxns?.reduce((sum, txn) => sum + Number(txn.total_price), 0) || 0;

      // Fetch commissions by type
      const { data: commissions, error: commissionsError } = await supabase
        .from("commissions")
        .select("amount, commission_type, level");

      if (commissionsError) throw commissionsError;

      // Calculate commission payouts
      // Unilevel: levels 1-7 direct percentage commissions
      const unilevelPayouts = commissions
        ?.filter((c) => c.commission_type === "purchase" && c.level >= 1 && c.level <= 7)
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Stairstep: commission from stair-step MLM plan
      const stairstepPayouts = commissions
        ?.filter((c) => c.commission_type === "stair_step")
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Breakaway: when downline reaches same level as upline
      const breakawayPayouts = commissions
        ?.filter((c) => c.commission_type === "breakaway")
        .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      const totalCommissions = unilevelPayouts + stairstepPayouts + breakawayPayouts;
      const totalSales = productSales + creditCashins + diamondCashins;
      const netProfit = totalSales - totalCommissions;

      setSalesData({
        totalSales,
        productSales,
        creditCashins,
        diamondCashins,
        unilevelPayouts,
        stairstepPayouts,
        breakawayPayouts,
        totalCommissions,
        netProfit,
      });
    } catch (error: any) {
      console.error("Error fetching sales analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const percentages = {
    unilevel: salesData.totalSales > 0 ? (salesData.unilevelPayouts / salesData.totalSales) * 100 : 0,
    stairstep: salesData.totalSales > 0 ? (salesData.stairstepPayouts / salesData.totalSales) * 100 : 0,
    breakaway: salesData.totalSales > 0 ? (salesData.breakawayPayouts / salesData.totalSales) * 100 : 0,
    totalCommissions: salesData.totalSales > 0 ? (salesData.totalCommissions / salesData.totalSales) * 100 : 0,
    netProfit: salesData.totalSales > 0 ? (salesData.netProfit / salesData.totalSales) * 100 : 0,
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <TrendingUp className="h-6 w-6 text-primary" />
            Sales Analytics Dashboard
          </CardTitle>
          <CardDescription>Complete breakdown of total sales and commission distribution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Sales Overview */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-background/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                </div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(salesData.totalSales, "PHP")}</p>
              </CardContent>
            </Card>

            <Card className="bg-background/50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Product Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData.productSales, "PHP")}</p>
                <p className="text-xs text-muted-foreground mt-1">From merchandise orders</p>
              </CardContent>
            </Card>

            <Card className="bg-background/50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Credit Cash-ins</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData.creditCashins, "PHP")}</p>
                <p className="text-xs text-muted-foreground mt-1">Approved credit purchases</p>
              </CardContent>
            </Card>

            <Card className="bg-background/50">
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">Diamond Cash-ins</p>
                <p className="text-2xl font-bold">{formatCurrency(salesData.diamondCashins, "PHP")}</p>
                <p className="text-xs text-muted-foreground mt-1">From diamond marketplace</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Commission Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Commission Distribution</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Unilevel Payouts</p>
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                      <Percent className="h-3 w-3 mr-1" />
                      {percentages.unilevel.toFixed(2)}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesData.unilevelPayouts, "PHP")}</p>
                  <p className="text-xs text-muted-foreground mt-1">7-level network commissions</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-500/10 border-purple-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Stairstep Payouts</p>
                    <Badge variant="outline" className="border-purple-500 text-purple-500">
                      <Percent className="h-3 w-3 mr-1" />
                      {percentages.stairstep.toFixed(2)}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(salesData.stairstepPayouts, "PHP")}</p>
                  <p className="text-xs text-muted-foreground mt-1">3-tier MLM plan commissions</p>
                </CardContent>
              </Card>

              <Card className="bg-orange-500/10 border-orange-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Breakaway Payouts</p>
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      <Percent className="h-3 w-3 mr-1" />
                      {percentages.breakaway.toFixed(2)}%
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(salesData.breakawayPayouts, "PHP")}</p>
                  <p className="text-xs text-muted-foreground mt-1">Override on matched ranks</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-medium">Total Commission Payouts</p>
                  </div>
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    <Percent className="h-3 w-3 mr-1" />
                    {percentages.totalCommissions.toFixed(2)}%
                  </Badge>
                </div>
                <p className="text-3xl font-bold text-amber-600">{formatCurrency(salesData.totalCommissions, "PHP")}</p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Net Profit */}
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                  <p className="text-lg font-semibold">Admin Net Profit</p>
                </div>
                <Badge variant="outline" className="border-green-500 text-green-500 text-base">
                  <Percent className="h-4 w-4 mr-1" />
                  {percentages.netProfit.toFixed(2)}%
                </Badge>
              </div>
              <p className="text-4xl font-bold text-green-600 mb-2">{formatCurrency(salesData.netProfit, "PHP")}</p>
              <p className="text-sm text-muted-foreground">
                Total Sales - Total Commission Payouts = Net Profit
              </p>
              <div className="mt-4 p-4 bg-background/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Accounting Formula:</p>
                <p className="text-sm font-mono">
                  {formatCurrency(salesData.totalSales, "PHP")} - {formatCurrency(salesData.totalCommissions, "PHP")} = {formatCurrency(salesData.netProfit, "PHP")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Breakdown Table */}
          <Card className="bg-background/50">
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-4">Detailed Accounting Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Product Sales (Delivered Orders)</span>
                  <span>{formatCurrency(salesData.productSales, "PHP")}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Credit Cash-ins (Approved)</span>
                  <span>{formatCurrency(salesData.creditCashins, "PHP")}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="font-medium">Diamond Cash-ins (Marketplace)</span>
                  <span>{formatCurrency(salesData.diamondCashins, "PHP")}</span>
                </div>
                <div className="flex justify-between py-2 border-b font-semibold text-base">
                  <span>Total Revenue</span>
                  <span className="text-primary">{formatCurrency(salesData.totalSales, "PHP")}</span>
                </div>
                <div className="flex justify-between py-2 border-b text-muted-foreground">
                  <span className="pl-4">- Unilevel Payouts ({percentages.unilevel.toFixed(2)}%)</span>
                  <span>({formatCurrency(salesData.unilevelPayouts, "PHP")})</span>
                </div>
                <div className="flex justify-between py-2 border-b text-muted-foreground">
                  <span className="pl-4">- Stairstep Payouts ({percentages.stairstep.toFixed(2)}%)</span>
                  <span>({formatCurrency(salesData.stairstepPayouts, "PHP")})</span>
                </div>
                <div className="flex justify-between py-2 border-b text-muted-foreground">
                  <span className="pl-4">- Breakaway Payouts ({percentages.breakaway.toFixed(2)}%)</span>
                  <span>({formatCurrency(salesData.breakawayPayouts, "PHP")})</span>
                </div>
                <div className="flex justify-between py-2 border-b font-semibold text-base">
                  <span>Total Commissions Paid</span>
                  <span className="text-amber-600">({formatCurrency(salesData.totalCommissions, "PHP")})</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg bg-green-500/10 px-4 rounded-lg mt-2">
                  <span>Net Profit</span>
                  <span className="text-green-600">{formatCurrency(salesData.netProfit, "PHP")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
