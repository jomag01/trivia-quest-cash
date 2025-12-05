import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bike, Car, Upload, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

export const RiderApplication = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    vehicle_type: "",
    license_number: "",
  });
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);

  const { data: riderProfile, isLoading } = useQuery({
    queryKey: ["rider-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("delivery_riders")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      let id_front_url = "";
      let id_back_url = "";
      let selfie_url = "";

      // Upload ID front
      if (idFront) {
        const path = `riders/${user?.id}/id-front-${Date.now()}`;
        const { data, error } = await supabase.storage.from("rider-documents").upload(path, idFront);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("rider-documents").getPublicUrl(data.path);
        id_front_url = urlData.publicUrl;
      }

      // Upload ID back
      if (idBack) {
        const path = `riders/${user?.id}/id-back-${Date.now()}`;
        const { data, error } = await supabase.storage.from("rider-documents").upload(path, idBack);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("rider-documents").getPublicUrl(data.path);
        id_back_url = urlData.publicUrl;
      }

      // Upload selfie
      if (selfie) {
        const path = `riders/${user?.id}/selfie-${Date.now()}`;
        const { data, error } = await supabase.storage.from("rider-documents").upload(path, selfie);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("rider-documents").getPublicUrl(data.path);
        selfie_url = urlData.publicUrl;
      }

      const { error } = await (supabase as any).from("delivery_riders").insert({
        user_id: user?.id,
        vehicle_type: formData.vehicle_type,
        license_number: formData.license_number || null,
        id_front_url,
        id_back_url,
        selfie_url,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-profile"] });
      toast.success("Application submitted! Awaiting admin approval.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit application");
    },
  });

  if (isLoading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  // Show status if already applied
  if (riderProfile) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bike className="w-4 h-4" /> Delivery Rider Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {riderProfile.status === "pending" && (
              <>
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <Badge variant="secondary" className="mb-1">Pending</Badge>
                  <p className="text-xs text-muted-foreground">Your application is under review.</p>
                </div>
              </>
            )}
            {riderProfile.status === "approved" && (
              <>
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <Badge className="bg-green-500 mb-1">Approved</Badge>
                  <p className="text-xs text-muted-foreground">You can now accept deliveries!</p>
                </div>
              </>
            )}
            {riderProfile.status === "rejected" && (
              <>
                <XCircle className="w-8 h-8 text-destructive" />
                <div>
                  <Badge variant="destructive" className="mb-1">Rejected</Badge>
                  <p className="text-xs text-muted-foreground">{riderProfile.admin_notes || "Contact support for details."}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bike className="w-4 h-4" /> Become a Delivery Rider
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Earn by delivering food orders. Apply now and get approved by admin.
        </p>

        <div>
          <Label className="text-xs">Vehicle Type *</Label>
          <Select value={formData.vehicle_type} onValueChange={(v) => setFormData({ ...formData, vehicle_type: v })}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="motorcycle">🏍️ Motorcycle</SelectItem>
              <SelectItem value="bicycle">🚲 Bicycle</SelectItem>
              <SelectItem value="car">🚗 Car</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">License Number (if applicable)</Label>
          <Input
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            placeholder="Driver's license number"
            className="h-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">ID Front *</Label>
            <div className="mt-1">
              {idFront ? (
                <div className="text-xs text-green-600 truncate">{idFront.name}</div>
              ) : (
                <label className="flex items-center justify-center h-16 border-2 border-dashed rounded cursor-pointer hover:border-primary">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setIdFront(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">ID Back *</Label>
            <div className="mt-1">
              {idBack ? (
                <div className="text-xs text-green-600 truncate">{idBack.name}</div>
              ) : (
                <label className="flex items-center justify-center h-16 border-2 border-dashed rounded cursor-pointer hover:border-primary">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setIdBack(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Selfie *</Label>
            <div className="mt-1">
              {selfie ? (
                <div className="text-xs text-green-600 truncate">{selfie.name}</div>
              ) : (
                <label className="flex items-center justify-center h-16 border-2 border-dashed rounded cursor-pointer hover:border-primary">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setSelfie(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isPending || !formData.vehicle_type || !idFront || !idBack || !selfie}
          className="w-full text-sm h-9"
        >
          {applyMutation.isPending ? "Submitting..." : "Submit Application"}
        </Button>
      </CardContent>
    </Card>
  );
};