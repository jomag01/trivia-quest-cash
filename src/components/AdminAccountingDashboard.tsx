import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, DollarSign, TrendingUp, Users, Gem, Calculator } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";

interface WeeklySalesData {
  totalSales: number;
  adminCommission: number;
  unilevelPayout: number;
  stairStepPayout: number;
  leadershipPayout: number;
  netAdminIncome: number;
}

export default function AdminAccountingDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [weeklyData, setWeeklyData] = useState<WeeklySalesData>({
    totalSales: 0,
    adminCommission: 0,
    unilevelPayout: 0,
    stairStepPayout: 0,
    leadershipPayout: 0,
    netAdminIncome: 0,
  });
  
  // Commission distribution percentages
  const [unilevelPercent, setUnilevelPercent] = useState("40");
  const [stairStepPercent, setStairStepPercent] = useState("35");
  const [leadershipPercent, setLeadershipPercent] = useState("25");
  const [diamondBasePrice, setDiamondBasePrice] = useState(10);

  useEffect(() => {
    fetchSettings();
    fetchWeeklySales();

    // Real-time subscription for product orders
    const ordersChannel = supabase
      .channel('accounting-orders-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'delivered' || newStatus === 'completed') {
            console.log('Order delivered - refreshing accounting data');
            fetchWeeklySales();
          }
        }
      )
      .subscribe();

    // Real-time subscription for food orders
    const foodOrdersChannel = supabase
      .channel('accounting-food-orders-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'food_orders'
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          if (newStatus === 'delivered') {
            console.log('Food order delivered - refreshing accounting data');
            fetchWeeklySales();
          }
        }
      )
      .subscribe();

    // Real-time for new orders
    const newOrdersChannel = supabase
      .channel('accounting-new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        () => {
          console.log('New order placed - refreshing accounting data');
          fetchWeeklySales();
        }
      )
      .subscribe();

    const newFoodOrdersChannel = supabase
      .channel('accounting-new-food-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'food_orders'
        },
        () => {
          console.log('New food order placed - refreshing accounting data');
          fetchWeeklySales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(foodOrdersChannel);
      supabase.removeChannel(newOrdersChannel);
      supabase.removeChannel(newFoodOrdersChannel);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("*")
        .in("setting_key", [
          "unilevel_commission_percent",
          "stair_step_commission_percent",
          "leadership_commission_percent",
          "diamond_base_price",
        ]);

      if (error) throw error;

      const unilevel = data?.find((s) => s.setting_key === "unilevel_commission_percent");
      const stairStep = data?.find((s) => s.setting_key === "stair_step_commission_percent");
      const leadership = data?.find((s) => s.setting_key === "leadership_commission_percent");
      const diamondPrice = data?.find((s) => s.setting_key === "diamond_base_price");

      if (unilevel) setUnilevelPercent(unilevel.setting_value);
      if (stairStep) setStairStepPercent(stairStep.setting_value);
      if (leadership) setLeadershipPercent(leadership.setting_value);
      if (diamondPrice) setDiamondBasePrice(parseFloat(diamondPrice.setting_value));
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchWeeklySales = async () => {
    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch product orders for this week
      const { data: productOrders, error: productError } = await supabase
        .from("orders")
        .select("total_amount, total_diamond_credits")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .in("status", ["delivered", "completed", "processing", "shipped"]);

      // Fetch food orders for this week
      const { data: foodOrders, error: foodError } = await supabase
        .from("food_orders")
        .select("total_amount, diamond_reward")
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString())
        .neq("status", "cancelled");

      if (productError) throw productError;
      if (foodError) throw foodError;

      // Calculate totals
      const productSales = productOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const foodSales = foodOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const totalSales = productSales + foodSales;

      // Fetch commission percentages
      const { data: settingsData } = await supabase
        .from("treasure_admin_settings")
        .select("*")
        .in("setting_key", [
          "unilevel_commission_percent",
          "stair_step_commission_percent",
          "leadership_commission_percent",
          "diamond_base_price",
        ]);

      const unilevelPct = parseFloat(settingsData?.find(s => s.setting_key === "unilevel_commission_percent")?.setting_value || "40");
      const stairStepPct = parseFloat(settingsData?.find(s => s.setting_key === "stair_step_commission_percent")?.setting_value || "35");
      const leadershipPct = parseFloat(settingsData?.find(s => s.setting_key === "leadership_commission_percent")?.setting_value || "25");
      const pricePerDiamond = parseFloat(settingsData?.find(s => s.setting_key === "diamond_base_price")?.setting_value || "10");

      // Calculate referral diamonds value from orders
      const productReferralDiamonds = productOrders?.reduce((sum, o) => sum + (o.total_diamond_credits || 0), 0) || 0;
      const foodReferralDiamonds = foodOrders?.reduce((sum, o) => sum + (o.diamond_reward || 0), 0) || 0;
      const totalReferralDiamondValue = (productReferralDiamonds + foodReferralDiamonds) * pricePerDiamond;

      // Calculate commission distributions
      const unilevelPayout = (totalReferralDiamondValue * unilevelPct) / 100;
      const stairStepPayout = (totalReferralDiamondValue * stairStepPct) / 100;
      const leadershipPayout = (totalReferralDiamondValue * leadershipPct) / 100;
      const totalAffiliatePayout = unilevelPayout + stairStepPayout + leadershipPayout;
      const adminCommission = totalSales - totalAffiliatePayout;

      setWeeklyData({
        totalSales,
        adminCommission,
        unilevelPayout,
        stairStepPayout,
        leadershipPayout,
        netAdminIncome: adminCommission,
      });
    } catch (error) {
      console.error("Error fetching weekly sales:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("treasure_admin_settings")
        .upsert([{ setting_key: key, setting_value: value }], { onConflict: "setting_key" });

      if (error) throw error;

      toast.success("Setting updated successfully");
      fetchSettings();
      fetchWeeklySales();
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const totalPercentage = parseFloat(unilevelPercent || "0") + parseFloat(stairStepPercent || "0") + parseFloat(leadershipPercent || "0");

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Sales This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">₱{weeklyData.totalSales.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Admin Net Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₱{weeklyData.netAdminIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Affiliate Payouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              ₱{(weeklyData.unilevelPayout + weeklyData.stairStepPayout + weeklyData.leadershipPayout).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Weekly Commission Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of referral diamonds to affiliate networks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Unilevel (7 Levels)</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                ₱{weeklyData.unilevelPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{unilevelPercent}% of referral value</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Stair Step MLM</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                ₱{weeklyData.stairStepPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stairStepPercent}% of referral value</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Leadership Breakaway</p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                ₱{weeklyData.leadershipPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{leadershipPercent}% of referral value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission Distribution Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="w-5 h-5" />
            Referral Diamond Distribution Settings
          </CardTitle>
          <CardDescription>
            Configure how referral commission diamonds are distributed among affiliate networks.
            {totalPercentage !== 100 && (
              <span className="text-destructive font-medium ml-2">
                (Total: {totalPercentage}% - should equal 100%)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Unilevel 7-Level Network (%)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={unilevelPercent}
                  onChange={(e) => setUnilevelPercent(e.target.value)}
                />
                <Button 
                  onClick={() => handleUpdateSetting("unilevel_commission_percent", unilevelPercent)} 
                  disabled={saving}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
            <div>
              <Label>Stair Step MLM (%)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={stairStepPercent}
                  onChange={(e) => setStairStepPercent(e.target.value)}
                />
                <Button 
                  onClick={() => handleUpdateSetting("stair_step_commission_percent", stairStepPercent)} 
                  disabled={saving}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
            <div>
              <Label>Leadership Breakaway (%)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={leadershipPercent}
                  onChange={(e) => setLeadershipPercent(e.target.value)}
                />
                <Button 
                  onClick={() => handleUpdateSetting("leadership_commission_percent", leadershipPercent)} 
                  disabled={saving}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Referral diamonds × Price per Diamond (₱{diamondBasePrice}) = Total referral commission value, which is then distributed according to these percentages.
          </p>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Flow Explanation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><strong>1. Product Commission (Admin Profit):</strong> The markup percentage set by admin on vendor products goes directly to admin as platform profit.</p>
          <p><strong>2. Diamond Rewards (Buyer):</strong> When a buyer purchases a product, they receive diamonds directly to their account based on the diamond_reward field set by admin.</p>
          <p><strong>3. Referral Commission Diamonds (Affiliates):</strong> The referral_commission_diamonds field value is multiplied by the diamond base price (₱{diamondBasePrice}) and distributed:</p>
          <ul className="list-disc list-inside ml-4">
            <li>{unilevelPercent}% to the 7-level upline network</li>
            <li>{stairStepPercent}% through the stair-step MLM plan based on qualification</li>
            <li>{leadershipPercent}% to leadership breakaway bonuses for top affiliates</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}