import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownUp, User, CheckCircle, Clock } from "lucide-react";

const RiderTurnoverManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: turnovers, isLoading } = useQuery({
    queryKey: ["rider-turnovers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courier_rider_turnovers")
        .select(`
          *,
          rider:courier_riders(full_name, phone),
          hub:courier_hubs(name, code)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const approveTurnoverMutation = useMutation({
    mutationFn: async (turnoverId: string) => {
      const { data, error } = await supabase.functions.invoke("courier-cod", {
        body: { action: "approve-turnover", turnover_id: turnoverId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Turnover approved" });
      queryClient.invalidateQueries({ queryKey: ["rider-turnovers"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const pendingTurnovers = turnovers?.filter((t: any) => t.status === "pending") || [];
  const completedTurnovers = turnovers?.filter((t: any) => t.status !== "pending") || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Turnovers ({pendingTurnovers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingTurnovers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No pending turnovers</p>
          ) : (
            <div className="space-y-3">
              {pendingTurnovers.map((turnover: any) => (
                <div key={turnover.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{turnover.rider?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {turnover.hub?.name} • {new Date(turnover.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold">₱{turnover.total_amount?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{turnover.parcel_count} parcels</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => approveTurnoverMutation.mutate(turnover.id)}
                      disabled={approveTurnoverMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            Recent Turnovers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedTurnovers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No completed turnovers</p>
          ) : (
            <div className="space-y-2">
              {completedTurnovers.slice(0, 10).map((turnover: any) => (
                <div key={turnover.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{turnover.rider?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(turnover.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">₱{turnover.total_amount?.toLocaleString()}</span>
                    <Badge variant={turnover.status === "approved" ? "default" : "secondary"}>
                      {turnover.status}
                    </Badge>
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

export default RiderTurnoverManagement;
