import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  ShieldCheck, Upload, Camera, AlertCircle, CheckCircle2, 
  Clock, X, FileText, User
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  validateImage, 
  uploadVerificationImage, 
  UploadProgress 
} from "@/lib/imageUpload";

interface VerificationStatus {
  id: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  rejection_reason: string | null;
}

interface BeesMateVerificationProps {
  onVerificationChange?: (isVerified: boolean) => void;
}

export function BeesMateVerification({ onVerificationChange }: BeesMateVerificationProps) {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchVerification();
  }, [user]);

  const fetchVerification = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('beesmate_verifications')
        .select('id, verification_status, submitted_at, rejection_reason')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setVerification(data as VerificationStatus);
      onVerificationChange?.(data?.verification_status === 'approved');
    } catch (error) {
      console.error('Error fetching verification:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate before accepting
    const validation = validateImage(file, 'verification');
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate before accepting
    const validation = validateImage(file, 'verification');
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const submitVerification = async () => {
    if (!user || !idFile) {
      toast.error('Please upload your ID document');
      return;
    }

    setUploading(true);
    setUploadProgress({ progress: 0, status: 'uploading', message: 'Starting...' });
    
    try {
      // Upload ID document
      const idResult = await uploadVerificationImage(
        idFile, 
        user.id, 
        'id',
        setUploadProgress
      );

      if (!idResult.success) {
        throw new Error(idResult.error || 'Failed to upload ID');
      }

      let selfieUrl = null;
      if (selfieFile) {
        setUploadProgress({ progress: 50, status: 'uploading', message: 'Uploading selfie...' });
        
        const selfieResult = await uploadVerificationImage(
          selfieFile,
          user.id,
          'selfie',
          setUploadProgress
        );

        if (selfieResult.success) {
          selfieUrl = selfieResult.publicUrl;
        }
      }

      setUploadProgress({ progress: 90, status: 'uploading', message: 'Saving...' });

      // Submit verification
      const { error: insertError } = await supabase
        .from('beesmate_verifications')
        .upsert({
          user_id: user.id,
          id_document_url: idResult.publicUrl,
          selfie_url: selfieUrl,
          verification_status: 'pending',
          submitted_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      setUploadProgress({ progress: 100, status: 'complete', message: 'Success!' });
      toast.success('Verification submitted! We\'ll review it within 24-48 hours.');
      
      fetchVerification();
      setIdFile(null);
      setSelfieFile(null);
      setIdPreview(null);
      setSelfiePreview(null);
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      setUploadProgress({ progress: 0, status: 'error', message: 'Upload failed' });
      toast.error(error.message || 'Failed to submit verification. Tap to retry.');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(null), 2000);
    }
  };

  const getStatusBadge = () => {
    if (!verification) return null;
    
    switch (verification.verification_status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            <Clock className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Already verified
  if (verification?.verification_status === 'approved') {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-500 text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Identity Verified</h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground">
                Your profile is verified and shows a trust badge
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pending review
  if (verification?.verification_status === 'pending') {
    return (
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500 text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Verification Pending</h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-muted-foreground">
                Your ID is under review. This usually takes 24-48 hours.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5" />
          Get Verified
          {verification?.verification_status === 'rejected' && (
            <Badge variant="destructive" className="ml-2">Resubmit Required</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {verification?.verification_status === 'rejected' && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Verification Rejected
                </p>
                <p className="text-xs text-red-600 dark:text-red-500">
                  {verification.rejection_reason || 'Please submit a clearer photo of your ID'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Verify your identity to get a <strong>verified badge</strong> on your profile. 
            This builds trust and helps prevent scammers.
          </p>
        </div>

        {/* ID Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Valid ID Document <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Upload a photo of your government-issued ID (passport, driver's license, national ID)
          </p>
          
          {idPreview ? (
            <div className="relative">
              <img 
                src={idPreview} 
                alt="ID Preview" 
                className="w-full h-40 object-cover rounded-lg border"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => { setIdFile(null); setIdPreview(null); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleIdUpload}
              />
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload ID</span>
            </label>
          )}
        </div>

        {/* Selfie Upload (Optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Selfie with ID <span className="text-muted-foreground">(Optional)</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Take a selfie while holding your ID next to your face for faster verification
          </p>
          
          {selfiePreview ? (
            <div className="relative">
              <img 
                src={selfiePreview} 
                alt="Selfie Preview" 
                className="w-full h-40 object-cover rounded-lg border"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleSelfieUpload}
              />
              <User className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload selfie</span>
            </label>
          )}
        </div>

        {uploadProgress && (
          <div className="space-y-2">
            <Progress value={uploadProgress.progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {uploadProgress.message}
            </p>
          </div>
        )}

        <Button 
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
          onClick={submitVerification}
          disabled={uploading || !idFile}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Submit for Verification
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your documents are stored securely and only used for verification purposes.
        </p>
      </CardContent>
    </Card>
  );
}

// Verification Badge Component for display on profiles
export function VerificationBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;
  
  return (
    <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
      <ShieldCheck className="w-3 h-3 mr-1" />
      Verified
    </Badge>
  );
}
