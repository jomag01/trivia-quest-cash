import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

const CourierAnalytics = () => {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["courier-analytics"],
    queryFn: async () => {
      // Get status distribution
      const { data: shipments } = await supabase.from("courier_shipments").select("status");
      const statusCounts: Record<string, number> = {};
      (shipments || []).forEach((s: any) => {
        statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
      });

      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name: name.replace(/_/g, " "),
        value,
      }));

      // Get rider performance
      const { data: riders } = await supabase
        .from("courier_riders" as any)
        .select("rider_name, rider_code, total_deliveries, rating")
        .order("total_deliveries", { ascending: false })
        .limit(10);

      // Get hub performance
      const { data: hubs } = await supabase
        .from("courier_hubs")
        .select("hub_name, hub_code");

      // Get COD collection trend
      const days = 14;
      const codTrend = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const { data } = await supabase
          .from("courier_cod_transactions" as any)
          .select("amount")
          .gte("created_at", dateStr)
          .lt("created_at", nextDate.toISOString().split("T")[0]);

        const total = (data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        codTrend.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          amount: total,
        });
      }

      return {
        statusData,
        riderPerformance: riders || [],
        codTrend,
      };
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Shipment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics?.statusData || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {(analytics?.statusData || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Riders */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Riders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics?.riderPerformance || []}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="rider_name"
                    width={80}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="total_deliveries" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* COD Collection Trend */}
      <Card>
        <CardHeader>
          <CardTitle>COD Collection Trend (Last 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.codTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`₱${value.toLocaleString()}`, "Amount"]} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourierAnalytics;
