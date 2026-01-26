import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Package } from "lucide-react";

const CODExceptionHandler = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [resolutionType, setResolutionType] = useState<string>("");

  const { data: exceptions, isLoading } = useQuery({
    queryKey: ["cod-exceptions"],
    queryFn: async () => {
      // Get shipments with COD issues
      const { data: failedDeliveries } = await supabase
        .from("courier_shipments")
        .select(`
          *,
          cod_transaction:courier_cod_transactions(*)
        `)
        .eq("is_cod", true)
        .in("status", ["failed_delivery", "returned_to_sender", "lost", "damaged"])
        .order("updated_at", { ascending: false });

      // Get discrepancy cases (amount mismatch)
      const { data: discrepancies } = await supabase
        .from("courier_cod_transactions" as any)
        .select(`
          *,
          shipment:courier_shipments(tracking_number, cod_amount, status),
          rider:courier_riders(rider_name, rider_code)
        `)
        .eq("has_discrepancy", true)
        .order("created_at", { ascending: false });

      return {
        failedDeliveries: failedDeliveries || [],
        discrepancies: discrepancies || [],
      };
    },
  });

  const resolveExceptionMutation = useMutation({
    mutationFn: async (data: { caseId: string; type: string; resolution: string; action: string }) => {
      const { error } = await supabase.functions.invoke("courier-cod", {
        body: {
          action: "resolve-exception",
          case_id: data.caseId,
          case_type: data.type,
          resolution: data.resolution,
          resolution_action: data.action,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Exception resolved" });
      setSelectedCase(null);
      setResolution("");
      setResolutionType("");
      queryClient.invalidateQueries({ queryKey: ["cod-exceptions"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{exceptions?.failedDeliveries?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Failed Deliveries with COD</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{exceptions?.discrepancies?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Amount Discrepancies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Pending Returns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Deliveries with COD */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Failed Deliveries with COD
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions?.failedDeliveries?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No failed COD deliveries</p>
          ) : (
            <div className="space-y-3">
              {exceptions?.failedDeliveries?.map((shipment: any) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-mono font-medium">{shipment.tracking_number}</p>
                      <p className="text-sm text-muted-foreground">
                        COD: ₱{shipment.cod_amount?.toLocaleString()} • {shipment.recipient_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">{shipment.status?.replace(/_/g, " ")}</Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => setSelectedCase(shipment)}>
                          Resolve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Resolve COD Exception</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="font-mono text-sm">{shipment.tracking_number}</p>
                            <p className="text-lg font-bold">₱{shipment.cod_amount?.toLocaleString()}</p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Resolution Action</label>
                            <Select value={resolutionType} onValueChange={setResolutionType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select action" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="retry_delivery">Retry Delivery</SelectItem>
                                <SelectItem value="return_to_seller">Return to Seller</SelectItem>
                                <SelectItem value="refund_buyer">Refund Buyer</SelectItem>
                                <SelectItem value="write_off">Write Off</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea
                              placeholder="Add resolution notes..."
                              value={resolution}
                              onChange={(e) => setResolution(e.target.value)}
                            />
                          </div>
                          <Button
                            className="w-full"
                            onClick={() =>
                              resolveExceptionMutation.mutate({
                                caseId: shipment.id,
                                type: "failed_delivery",
                                resolution,
                                action: resolutionType,
                              })
                            }
                            disabled={!resolutionType || resolveExceptionMutation.isPending}
                          >
                            {resolveExceptionMutation.isPending ? "Processing..." : "Resolve Exception"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amount Discrepancies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Amount Discrepancies
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exceptions?.discrepancies?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No discrepancies found</p>
          ) : (
            <div className="space-y-3">
              {exceptions?.discrepancies?.map((disc: any) => (
                <div
                  key={disc.id}
                  className="flex items-center justify-between p-4 border rounded-lg border-yellow-200"
                >
                  <div>
                    <p className="font-mono font-medium">{disc.shipment?.tracking_number}</p>
                    <p className="text-sm text-muted-foreground">
                      Expected: ₱{disc.shipment?.cod_amount?.toLocaleString()} •
                      Collected: ₱{disc.amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rider: {disc.rider?.rider_name || disc.rider?.rider_code}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-600 font-medium">
                      Δ ₱{Math.abs((disc.shipment?.cod_amount || 0) - (disc.amount || 0)).toLocaleString()}
                    </span>
                    <Button size="sm" variant="outline">
                      Investigate
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CODExceptionHandler;
