import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, MapPin, Camera, CheckCircle, XCircle, Navigation } from "lucide-react";

const RiderActiveDelivery = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isFailOpen, setIsFailOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [signature, setSignature] = useState("");
  const [failReason, setFailReason] = useState("");
  const [notes, setNotes] = useState("");

  const { data: activeJobs, isLoading } = useQuery({
    queryKey: ["rider-active-jobs"],
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
            recipient_name,
            recipient_phone,
            recipient_address,
            recipient_city,
            cod_amount,
            is_cod
          )
        `)
        .eq("rider_id", rider.id)
        .eq("status", "in_progress")
        .eq("job_type", "delivery");

      return data || [];
    },
  });

  const completeDeliveryMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("courier-rider", {
        body: {
          action: "complete-delivery",
          job_id: selectedJob.id,
          signature,
          notes,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Delivery Completed", description: "Great job!" });
      setIsCompleteOpen(false);
      setSelectedJob(null);
      setSignature("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["rider-active-jobs"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const failDeliveryMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("courier-rider", {
        body: {
          action: "fail-delivery",
          job_id: selectedJob.id,
          reason: failReason,
          notes,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Delivery Failed", description: "Reason recorded" });
      setIsFailOpen(false);
      setSelectedJob(null);
      setFailReason("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["rider-active-jobs"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  if (!activeJobs || activeJobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No active deliveries</p>
          <p className="text-xs mt-1">Accept a delivery job to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activeJobs.map((job: any) => (
        <Card key={job.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono">
                {job.shipment?.tracking_number}
              </CardTitle>
              {job.shipment?.is_cod && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                  COD ₱{job.shipment?.cod_amount?.toLocaleString()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">{job.shipment?.recipient_name}</p>
                  <p className="text-sm text-muted-foreground">{job.shipment?.recipient_address}</p>
                  <p className="text-sm text-muted-foreground">{job.shipment?.recipient_city}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  const address = encodeURIComponent(job.shipment?.recipient_address || "");
                  window.open(`https://maps.google.com/?q=${address}`, "_blank");
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Navigate
              </Button>
              <a href={`tel:${job.shipment?.recipient_phone}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Call
                </Button>
              </a>
            </div>

            <div className="flex gap-2">
              <Dialog open={isCompleteOpen && selectedJob?.id === job.id} onOpenChange={(open) => {
                setIsCompleteOpen(open);
                if (open) setSelectedJob(job);
              }}>
                <DialogTrigger asChild>
                  <Button className="flex-1" onClick={() => setSelectedJob(job)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Complete Delivery</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Recipient Signature/Name</Label>
                      <Input
                        placeholder="Recipient name who received the parcel"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Photo Proof</Label>
                      <Button variant="outline" className="w-full">
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        placeholder="Any additional notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => completeDeliveryMutation.mutate()}
                      disabled={!signature || completeDeliveryMutation.isPending}
                    >
                      {completeDeliveryMutation.isPending ? "Completing..." : "Confirm Delivery"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isFailOpen && selectedJob?.id === job.id} onOpenChange={(open) => {
                setIsFailOpen(open);
                if (open) setSelectedJob(job);
              }}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="flex-1" onClick={() => setSelectedJob(job)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Failed
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Failed Delivery</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Select value={failReason} onValueChange={setFailReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="no_one_home">No one at home</SelectItem>
                          <SelectItem value="wrong_address">Wrong address</SelectItem>
                          <SelectItem value="refused">Customer refused</SelectItem>
                          <SelectItem value="incomplete_address">Incomplete address</SelectItem>
                          <SelectItem value="unreachable">Cannot contact customer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Notes</Label>
                      <Textarea
                        placeholder="Describe what happened..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => failDeliveryMutation.mutate()}
                      disabled={!failReason || failDeliveryMutation.isPending}
                    >
                      {failDeliveryMutation.isPending ? "Submitting..." : "Submit Failed Delivery"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RiderActiveDelivery;
