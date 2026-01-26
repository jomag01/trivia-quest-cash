import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, MapPin, Phone, Clock, CheckCircle } from "lucide-react";

const RiderJobList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [jobType, setJobType] = useState("pickup");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["rider-jobs", jobType],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];

      const { data: rider } = await supabase
        .from("courier_riders")
        .select("id")
        .eq("user_id", session.session.user.id)
        .single();

      if (!rider) return [];

      const { data } = await supabase
        .from("courier_rider_jobs")
        .select(`
          *,
          shipment:courier_shipments(
            tracking_number,
            sender_name,
            sender_phone,
            sender_address,
            recipient_name,
            recipient_phone,
            recipient_address,
            cod_amount,
            is_cod
          )
        `)
        .eq("rider_id", rider.id)
        .eq("job_type", jobType)
        .in("status", ["assigned", "in_progress"])
        .order("created_at", { ascending: true });

      return data || [];
    },
  });

  const acceptJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke("courier-rider", {
        body: { action: "accept-job", job_id: jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Job Accepted", description: "You can now proceed with the task" });
      queryClient.invalidateQueries({ queryKey: ["rider-jobs"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading jobs...</div>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={jobType} onValueChange={setJobType}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pickup">Pickups</TabsTrigger>
          <TabsTrigger value="delivery">Deliveries</TabsTrigger>
        </TabsList>
      </Tabs>

      {jobs?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No {jobType} jobs available</p>
          </CardContent>
        </Card>
      ) : (
        jobs?.map((job: any) => (
          <Card key={job.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono">
                  {job.shipment?.tracking_number}
                </CardTitle>
                <Badge variant={job.status === "assigned" ? "secondary" : "default"}>
                  {job.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {jobType === "pickup" ? job.shipment?.sender_name : job.shipment?.recipient_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {jobType === "pickup" ? job.shipment?.sender_address : job.shipment?.recipient_address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${jobType === "pickup" ? job.shipment?.sender_phone : job.shipment?.recipient_phone}`}
                    className="text-sm text-primary"
                  >
                    {jobType === "pickup" ? job.shipment?.sender_phone : job.shipment?.recipient_phone}
                  </a>
                </div>

                {job.shipment?.is_cod && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      COD: ₱{job.shipment?.cod_amount?.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {job.status === "assigned" && (
                  <Button
                    className="flex-1"
                    onClick={() => acceptJobMutation.mutate(job.id)}
                    disabled={acceptJobMutation.isPending}
                  >
                    Accept Job
                  </Button>
                )}
                {job.status === "in_progress" && (
                  <Button className="flex-1" variant="default">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default RiderJobList;
