import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package, MapPin, ArrowRight } from "lucide-react";

const HubSortingPanel = () => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const { data: parcelsToSort } = useQuery({
    queryKey: ["parcels-to-sort", selectedZone],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_hub_scans")
        .select(`
          *,
          shipment:courier_shipments(id, tracking_number, recipient_name, recipient_city, recipient_province, destination_zone_id)
        `)
        .eq("scan_type", "arrival")
        .order("scanned_at", { ascending: false });
      return data || [];
    },
  });

  const groupedParcels = parcelsToSort?.reduce((acc: any, scan: any) => {
    const zoneId = scan.shipment?.destination_zone_id || "unknown";
    const zoneName = scan.shipment?.destination_zone?.name || "Unknown Zone";
    if (!acc[zoneId]) {
      acc[zoneId] = { name: zoneName, parcels: [] };
    }
    acc[zoneId].parcels.push(scan);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parcels Ready for Sorting
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!groupedParcels || Object.keys(groupedParcels).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No parcels awaiting sorting</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(groupedParcels).map(([zoneId, data]: [string, any]) => (
                <Card key={zoneId} className="border-2 hover:border-primary transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">{data.name}</CardTitle>
                      </div>
                      <Badge variant="secondary">{data.parcels.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {data.parcels.slice(0, 5).map((scan: any) => (
                        <div key={scan.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <span className="font-mono">{scan.shipment?.tracking_number}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                      {data.parcels.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{data.parcels.length - 5} more parcels
                        </p>
                      )}
                    </div>
                    <Button className="w-full mt-4" size="sm">
                      Sort All to {data.name}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HubSortingPanel;
