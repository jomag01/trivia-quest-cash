import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, TruckIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HubDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["hub-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [pending, inTransit, delivered, exceptions] = await Promise.all([
        supabase.from("courier_shipments").select("id", { count: "exact" }).eq("status", "created"),
        supabase.from("courier_shipments").select("id", { count: "exact" }).in("status", ["picked_up", "in_transit", "at_origin_hub", "out_for_delivery"]),
        supabase.from("courier_shipments").select("id", { count: "exact" }).eq("status", "delivered"),
        supabase.from("courier_shipments").select("id", { count: "exact" }).in("status", ["failed_delivery", "return_to_sender", "lost"]),
      ]);

      return {
        pending: pending.count || 0,
        inTransit: inTransit.count || 0,
        delivered: delivered.count || 0,
        exceptions: exceptions.count || 0,
      };
    },
  });

  const { data: recentScans } = useQuery({
    queryKey: ["recent-scans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_hub_scans")
        .select(`
          *,
          shipment:courier_shipments(tracking_number, recipient_name),
          hub:courier_hubs(name)
        `)
        .order("scanned_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Pickup</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inTransit}</div>
            <p className="text-xs text-muted-foreground">Currently moving</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivered Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.delivered}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exceptions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.exceptions}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentScans?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent scans</p>
            ) : (
              recentScans?.map((scan: any) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{scan.shipment?.tracking_number}</p>
                    <p className="text-sm text-muted-foreground">{scan.shipment?.recipient_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scan.scan_type === 'arrival' ? 'bg-blue-100 text-blue-800' :
                      scan.scan_type === 'sorting' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {scan.scan_type}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(scan.scanned_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HubDashboard;
