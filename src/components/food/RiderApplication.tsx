import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadToStorage } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bike, Upload, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";

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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

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

  // Compress image before upload
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch {
      return file;
    }
  };

  // Upload files in background after DB insert
  const uploadFilesAsync = async (riderId: string) => {
    const uploads: Promise<void>[] = [];

    const uploadFile = async (file: File | null, fieldName: string, label: string) => {
      if (!file) return;
      try {
        setUploadProgress(`Uploading ${label}...`);
        const compressed = await compressImage(file);
        const path = `riders/${user?.id}/${fieldName}-${Date.now()}`;
        const { data, error } = await uploadToStorage("rider-documents", path, compressed);
        
        if (error) {
          console.error(`Failed to upload ${label}:`, error);
          return;
        }

        // Update the rider record with the file URL
        await (supabase as any)
          .from("delivery_riders")
          .update({ [`${fieldName}_url`]: data?.publicUrl || "" })
          .eq("id", riderId);
      } catch (err) {
        console.error(`Upload error for ${label}:`, err);
      }
    };

    uploads.push(uploadFile(idFront, "id_front", "ID Front"));
    uploads.push(uploadFile(idBack, "id_back", "ID Back"));
    uploads.push(uploadFile(selfie, "selfie", "Selfie"));

    await Promise.all(uploads);
    setUploadProgress(null);
    queryClient.invalidateQueries({ queryKey: ["rider-profile"] });
  };

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("Please sign in to apply as a rider.");
      }

      // Step 1: Insert record IMMEDIATATELY (no file uploads blocking)
      const { data, error } = await (supabase as any)
        .from("delivery_riders")
        .insert({
          user_id: user.id,
          vehicle_type: formData.vehicle_type,
          license_number: formData.license_number || null,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Step 2: Upload files in background (non-blocking)
      if (data?.id) {
        uploadFilesAsync(data.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rider-profile"] });
      toast.success("Application submitted! Documents uploading in background.");
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
                  {uploadProgress && (
                    <p className="text-xs text-primary flex items-center gap-1 mt-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {uploadProgress}
                    </p>
                  )}
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
          {applyMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Submitting...
            </>
          ) : (
            "Submit Application"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};