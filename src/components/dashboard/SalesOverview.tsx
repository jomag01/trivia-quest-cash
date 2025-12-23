import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const formatMoney = (amount: number) => `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
import { formatCurrency } from "@/lib/currencies";
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  ShoppingCart,
  Utensils,
  Building2,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
  PiggyBank
} from "lucide-react";

interface SalesData {
  totalSales: number;
  shopSales: number;
  marketplaceSales: number;
  foodSales: number;
  serviceSales: number;
  commissions: number;
  referralEarnings: number;
  supplierEarnings: number;
  adminDeductions: number;
  netEarnings: number;
}

export default function SalesOverview() {
  const { user, profile } = useAuth();

  // Fetch combined sales data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ["user-sales-overview", user?.id],
    queryFn: async (): Promise<SalesData> => {
      if (!user) return getEmptyData();

      // Fetch shop sales (as seller)
      const { data: shopOrders } = await supabase
        .from("orders")
        .select("total_amount, status")
        .eq("seller_id", user.id)
        .eq("status", "delivered");

      // Fetch marketplace sales
      const { data: marketplaceSales } = await supabase
        .from("marketplace_listings")
        .select("price, status")
        .eq("seller_id", user.id)
        .eq("status", "sold");

      // Fetch food vendor sales
      const { data: foodVendor } = await supabase
        .from("food_vendors")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      let foodSales = 0;
      if (foodVendor) {
        const { data: foodOrders } = await supabase
          .from("food_orders")
          .select("total_amount")
          .eq("vendor_id", foodVendor.id)
          .eq("status", "delivered");
        foodSales = foodOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      }

      // Fetch service earnings
      const { data: serviceBookings } = await supabase
        .from("service_bookings")
        .select("total_amount, services!inner(provider_id)")
        .eq("services.provider_id", user.id)
        .eq("status", "completed");

      // Fetch commissions
      const { data: commissions } = await supabase
        .from("commissions")
        .select("amount")
        .eq("user_id", user.id);

      // Fetch leadership commissions
      const { data: leadershipCommissions } = await supabase
        .from("leadership_commissions")
        .select("amount")
        .eq("upline_id", user.id);

      // Fetch supplier earnings
      const { data: supplier } = await supabase
        .from("suppliers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let supplierEarnings = 0;
      if (supplier) {
        const { data: supplierOrders } = await supabase
          .from("order_items")
          .select("subtotal, orders!inner(status)")
          .eq("supplier_id", supplier.id)
          .eq("orders.status", "delivered");
        supplierEarnings = supplierOrders?.reduce((sum, o) => sum + Number(o.subtotal), 0) || 0;
      }

      // Fetch retailer commissions
      const { data: retailerCommissions } = await supabase
        .from("retailer_supplier_commissions")
        .select("commission_amount")
        .eq("retailer_id", user.id)
        .eq("status", "paid");

      const shopTotal = shopOrders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
      const marketplaceTotal = marketplaceSales?.reduce((sum, l) => sum + Number(l.price), 0) || 0;
      const serviceTotal = serviceBookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;
      const commissionsTotal = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const leadershipTotal = leadershipCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const retailerTotal = retailerCommissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      const totalSales = shopTotal + marketplaceTotal + foodSales + serviceTotal + supplierEarnings;
      const referralEarnings = commissionsTotal + leadershipTotal + retailerTotal;
      
      // Estimate admin deductions (15% platform fee for example)
      const adminDeductions = totalSales * 0.15;
      const netEarnings = totalSales + referralEarnings - adminDeductions;

      return {
        totalSales,
        shopSales: shopTotal,
        marketplaceSales: marketplaceTotal,
        foodSales,
        serviceSales: serviceTotal,
        commissions: commissionsTotal,
        referralEarnings,
        supplierEarnings,
        adminDeductions,
        netEarnings
      };
    },
    enabled: !!user
  });

  const getEmptyData = (): SalesData => ({
    totalSales: 0,
    shopSales: 0,
    marketplaceSales: 0,
    foodSales: 0,
    serviceSales: 0,
    commissions: 0,
    referralEarnings: 0,
    supplierEarnings: 0,
    adminDeductions: 0,
    netEarnings: 0
  });

  const data = salesData || getEmptyData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const earningsBreakdown = [
    { label: "Shop Sales", value: data.shopSales, icon: ShoppingCart, color: "text-blue-500" },
    { label: "Marketplace", value: data.marketplaceSales, icon: Building2, color: "text-purple-500" },
    { label: "Food Sales", value: data.foodSales, icon: Utensils, color: "text-orange-500" },
    { label: "Services", value: data.serviceSales, icon: Package, color: "text-green-500" },
    { label: "Supplier Sales", value: data.supplierEarnings, icon: TrendingUp, color: "text-teal-500" },
    { label: "Referral Commissions", value: data.referralEarnings, icon: Percent, color: "text-pink-500" }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(data.totalSales)}</p>
                <p className="text-sm text-muted-foreground">Total Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(data.referralEarnings)}</p>
                <p className="text-sm text-muted-foreground">Commissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ArrowDownRight className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">-{formatCurrency(data.adminDeductions)}</p>
                <p className="text-sm text-muted-foreground">Deductions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(data.netEarnings)}</p>
                <p className="text-sm text-muted-foreground">Net Earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Earnings Breakdown
          </CardTitle>
          <CardDescription>See where your revenue comes from</CardDescription>
        </CardHeader>
        <CardContent>
          {earningsBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No earnings yet</p>
              <p className="text-sm">Start selling to see your earnings breakdown</p>
            </div>
          ) : (
            <div className="space-y-4">
              {earningsBreakdown.map((item, index) => {
                const percentage = data.totalSales > 0 
                  ? ((item.value / (data.totalSales + data.referralEarnings)) * 100).toFixed(1)
                  : 0;
                const Icon = item.icon;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(item.value)}</span>
                        <span className="text-xs text-muted-foreground ml-2">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r from-primary to-primary/70`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Earnings Summary */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Net Earnings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Gross Sales</span>
              <span className="font-medium text-green-600">+{formatCurrency(data.totalSales)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Referral & Commissions</span>
              <span className="font-medium text-blue-600">+{formatCurrency(data.referralEarnings)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Platform Fees (15%)</span>
              <span className="font-medium text-red-600">-{formatCurrency(data.adminDeductions)}</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold">
              <span>Net Earnings</span>
              <span className="text-primary">{formatCurrency(data.netEarnings)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
