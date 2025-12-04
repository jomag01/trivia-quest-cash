import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Upload, X, Shield, Camera } from "lucide-react";

interface ProviderVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const ProviderVerificationDialog = ({ open, onOpenChange, onSuccess }: ProviderVerificationDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [idType, setIdType] = useState("");
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [previews, setPreviews] = useState<{front: string | null; back: string | null; selfie: string | null}>({
    front: null,
    back: null,
    selfie: null
  });

  const idTypes = [
    { value: "national_id", label: "National ID (PhilSys)" },
    { value: "passport", label: "Passport" },
    { value: "drivers_license", label: "Driver's License" },
    { value: "sss_id", label: "SSS ID" },
    { value: "philhealth_id", label: "PhilHealth ID" },
    { value: "postal_id", label: "Postal ID" },
    { value: "voters_id", label: "Voter's ID" }
  ];

  const handleFileChange = (file: File | null, type: 'front' | 'back' | 'selfie') => {
    if (!file) return;
    
    if (type === 'front') setIdFront(file);
    else if (type === 'back') setIdBack(file);
    else setSelfie(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: 'front' | 'back' | 'selfie') => {
    if (type === 'front') setIdFront(null);
    else if (type === 'back') setIdBack(null);
    else setSelfie(null);
    setPreviews(prev => ({ ...prev, [type]: null }));
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folder}_${Date.now()}.${fileExt}`;
    
    const { error, data } = await supabase.storage
      .from("provider-verification")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("provider-verification")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please log in first");
      return;
    }

    if (!idType || !idFront) {
      toast.error("Please select ID type and upload front of ID");
      return;
    }

    setLoading(true);

    try {
      // Upload files
      const frontUrl = await uploadFile(idFront, "id_front");
      const backUrl = idBack ? await uploadFile(idBack, "id_back") : null;
      const selfieUrl = selfie ? await uploadFile(selfie, "selfie") : null;

      if (!frontUrl) {
        toast.error("Failed to upload ID front image");
        setLoading(false);
        return;
      }

      // Create verification request
      const { error } = await (supabase
        .from("service_provider_verifications" as any)
        .insert({
          user_id: user.id,
          id_type: idType,
          id_front_url: frontUrl,
          id_back_url: backUrl,
          selfie_url: selfieUrl,
          status: "pending"
        }) as any);

      if (error) {
        console.error("Error creating verification:", error);
        toast.error("Failed to submit verification request");
      } else {
        toast.success("Verification submitted! We'll review it shortly.");
        onOpenChange(false);
        onSuccess?.();
        resetForm();
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    }

    setLoading(false);
  };

  const resetForm = () => {
    setIdType("");
    setIdFront(null);
    setIdBack(null);
    setSelfie(null);
    setPreviews({ front: null, back: null, selfie: null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Verify Your Identity
          </DialogTitle>
        </DialogHeader>

        <div className="bg-muted/50 p-3 rounded-lg text-sm mb-4">
          <p className="font-medium mb-1">Why verify?</p>
          <p className="text-muted-foreground">
            To ensure safety and trust, service providers must verify their identity 
            with a valid government-issued ID before offering services.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ID Type *</Label>
            <Select value={idType} onValueChange={setIdType}>
              <SelectTrigger>
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                {idTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ID Front */}
          <div>
            <Label>Front of ID *</Label>
            {previews.front ? (
              <div className="relative mt-2">
                <img src={previews.front} alt="ID Front" className="w-full h-40 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removeFile('front')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 mt-2">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Upload front of ID</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'front')}
                />
              </label>
            )}
          </div>

          {/* ID Back */}
          <div>
            <Label>Back of ID (optional)</Label>
            {previews.back ? (
              <div className="relative mt-2">
                <img src={previews.back} alt="ID Back" className="w-full h-40 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removeFile('back')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 mt-2">
                <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload back of ID</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'back')}
                />
              </label>
            )}
          </div>

          {/* Selfie with ID */}
          <div>
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Selfie holding ID (recommended)
            </Label>
            {previews.selfie ? (
              <div className="relative mt-2">
                <img src={previews.selfie} alt="Selfie" className="w-full h-40 object-cover rounded-lg" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removeFile('selfie')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 mt-2">
                <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Take a selfie holding your ID</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null, 'selfie')}
                />
              </label>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Submit for Verification"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProviderVerificationDialog;