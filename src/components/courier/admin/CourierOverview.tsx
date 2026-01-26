import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, Users, Wallet, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const CourierOverview = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["courier-admin-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const [shipments, riders, deliveredToday, pendingCOD] = await Promise.all([
        supabase.from("courier_shipments").select("status"),
        supabase.from("courier_riders" as any).select("id, is_available"),
        supabase
          .from("courier_shipments")
          .select("id", { count: "exact" })
          .eq("status", "delivered")
          .gte("delivered_at", today),
        supabase
          .from("courier_cod_transactions" as any)
          .select("amount")
          .in("status", ["collected", "turned_over"]),
      ]);

      const statusCounts = (shipments.data || []).reduce((acc: Record<string, number>, s: any) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});

      const activeRiders = (riders.data || []).filter((r: any) => r.is_available).length;
      const pendingCODTotal = (pendingCOD.data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      return {
        totalShipments: shipments.data?.length || 0,
        pending: statusCounts["created"] || 0,
        inTransit: (statusCounts["picked_up"] || 0) + (statusCounts["in_transit"] || 0) + (statusCounts["at_origin_hub"] || 0),
        outForDelivery: statusCounts["out_for_delivery"] || 0,
        delivered: statusCounts["delivered"] || 0,
        failed: statusCounts["failed_delivery"] || 0,
        totalRiders: riders.data?.length || 0,
        activeRiders,
        deliveredToday: deliveredToday.count || 0,
        pendingCOD: pendingCODTotal,
      };
    },
  });

  const { data: dailyStats } = useQuery({
    queryKey: ["courier-daily-stats"],
    queryFn: async () => {
      const days = 7;
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { count } = await supabase
          .from("courier_shipments")
          .select("id", { count: "exact" })
          .eq("status", "delivered")
          .gte("delivered_at", dateStr)
          .lt("delivered_at", nextDate.toISOString().split("T")[0]);

        data.push({
          date: date.toLocaleDateString("en-US", { weekday: "short" }),
          deliveries: count || 0,
        });
      }
      return data;
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShipments}</div>
            <p className="text-xs text-muted-foreground">Active in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Out for Delivery</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.outForDelivery}</div>
            <p className="text-xs text-muted-foreground">Being delivered now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Riders</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeRiders}/{stats?.totalRiders}
            </div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending COD</CardTitle>
            <Wallet className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats?.pendingCOD?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Awaiting remittance</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <Clock className="h-6 w-6 mx-auto text-yellow-600 mb-1" />
            <p className="text-xl font-bold">{stats?.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
          <CardContent className="pt-4 text-center">
            <Truck className="h-6 w-6 mx-auto text-blue-600 mb-1" />
            <p className="text-xl font-bold">{stats?.inTransit}</p>
            <p className="text-xs text-muted-foreground">In Transit</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200">
          <CardContent className="pt-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-purple-600 mb-1" />
            <p className="text-xl font-bold">{stats?.outForDelivery}</p>
            <p className="text-xs text-muted-foreground">Out for Delivery</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-1" />
            <p className="text-xl font-bold">{stats?.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
          <CardContent className="pt-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto text-red-600 mb-1" />
            <p className="text-xl font-bold">{stats?.failed}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="pt-4 text-center">
            <Package className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-xl font-bold">{stats?.deliveredToday}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Deliveries (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="deliveries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="deliveries" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CourierOverview;
