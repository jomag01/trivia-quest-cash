import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, Upload, ArrowLeft, CheckCircle, FileText, Camera, Wallet } from "lucide-react";
import { toast } from "sonner";

const ID_TYPES = [
  "National ID",
  "Driver's License",
  "Passport",
  "PhilSys ID",
  "SSS ID",
  "UMID",
  "Voter's ID",
  "PRC ID",
  "Postal ID",
];

const ALL_PAYMENT_METHODS = [
  { value: "cash_wallet", label: "Cash Wallet (Auto-deduct)", icon: Wallet },
  { value: "gcash", label: "GCash", icon: CreditCard },
  { value: "maya", label: "Maya / PayMaya", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: CreditCard },
];

const InstallmentApply = () => {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const offerId = params.get("offer");
  const productId = params.get("product");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [offer, setOffer] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [provider, setProvider] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState<string[]>([]);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash_wallet");

  // File uploads
  const [idDoc, setIdDoc] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [proofOfIncome, setProofOfIncome] = useState<File | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const [uploadingFiles, setUploadingFiles] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, offerId, productId]);

  const loadData = async () => {
    if (!user || !offerId || !productId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [offerRes, productRes, walletRes, profileRes, pmRes] = await Promise.all([
      supabase.from("user_installment_offers").select("*").eq("id", offerId).eq("user_id", user.id).eq("status", "active").maybeSingle(),
      supabase.from("products").select("id, name, base_price, image_url").eq("id", productId).maybeSingle(),
      supabase.from("cash_wallets").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("full_name, phone_number, location").eq("id", user.id).maybeSingle(),
      supabase.from("installment_payment_methods").select("method_key").eq("is_enabled", true),
    ]);

    if (!offerRes.data || !productRes.data) {
      toast.error("Offer not found or no longer active.");
      setLoading(false);
      return;
    }

    const providerRes = await supabase.from("installment_providers").select("*").eq("id", offerRes.data.provider_id).eq("is_active", true).maybeSingle();

    setOffer(offerRes.data);
    setProduct(productRes.data);
    setProvider(providerRes.data);
    setWalletBalance(walletRes.data?.balance || 0);
    const keys = (pmRes.data || []).map((r: any) => r.method_key);
    setEnabledMethods(keys);
    if (keys.length > 0 && !keys.includes(paymentMethod)) {
      setPaymentMethod(keys[0]);
    }

    // Pre-fill from profile
    if (profileRes.data) {
      if (profileRes.data.full_name) setFullName(profileRes.data.full_name);
      if (profileRes.data.phone_number) setPhone(profileRes.data.phone_number);
      if (profileRes.data.location) setAddress(profileRes.data.location);
    }

    setLoading(false);
  };

  const calcMonthly = (price: number, rate: number, months: number) => {
    const total = price * (1 + rate / 100);
    return total / months;
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("installment-docs").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage.from("installment-docs").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user || !offer || !product || !provider || !selectedTerm) return;

    // Validate required fields
    if (!fullName.trim() || !phone.trim() || !address.trim() || !birthdate || !idType || !idNumber.trim()) {
      toast.error("Please fill in all KYC fields.");
      return;
    }
    if (!idDoc) {
      toast.error("Please upload your ID document.");
      return;
    }
    if (!selfie) {
      toast.error("Please upload a selfie with your ID.");
      return;
    }

    setSubmitting(true);
    setUploadingFiles(true);

    try {
      // Upload documents
      const [idDocUrl, selfieUrl, incomeUrl, proofUrl] = await Promise.all([
        uploadFile(idDoc, "id-documents"),
        uploadFile(selfie, "selfies"),
        proofOfIncome ? uploadFile(proofOfIncome, "income-proof") : Promise.resolve(null),
        paymentProof ? uploadFile(paymentProof, "payment-proofs") : Promise.resolve(null),
      ]);

      setUploadingFiles(false);

      if (!idDocUrl || !selfieUrl) {
        toast.error("Failed to upload required documents. Please try again.");
        setSubmitting(false);
        return;
      }

      const term = parseInt(selectedTerm);
      const rate = provider.interest_rate_percent || 0;
      const monthly = calcMonthly(product.base_price, rate, term);
      const total = monthly * term;
      const downpayment = Math.round(monthly * 100) / 100;

      const { error } = await supabase.from("installment_applications").insert({
        user_id: user.id,
        product_id: product.id,
        provider_id: provider.id,
        term_months: term,
        monthly_payment: Math.round(monthly * 100) / 100,
        total_amount: Math.round(total * 100) / 100,
        downpayment_amount: downpayment,
        interest_rate: rate,
        status: "pending",
        offer_id: offer.id,
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        address: address.trim(),
        birthdate,
        id_type: idType,
        id_number: idNumber.trim(),
        id_document_url: idDocUrl,
        selfie_url: selfieUrl,
        proof_of_income_url: incomeUrl,
        payment_method: paymentMethod,
        payment_proof_url: proofUrl,
      });

      if (error) {
        console.error("Application error:", error);
        toast.error("Failed to submit: " + error.message);
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("An error occurred. Please try again.");
    }
    setSubmitting(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <p>Please login to apply for installment.</p>
          <Button className="mt-4" onClick={() => navigate("/auth")}>Login</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!offer || !product || !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-md">
          <p className="text-muted-foreground">This installment offer is not available or has expired.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold">Application Submitted!</h2>
          <p className="text-muted-foreground text-sm">
            Your installment application has been submitted for review. Upon admin approval, the downpayment will be deducted from your wallet.
          </p>
          <Button onClick={() => navigate("/dashboard?tab=installments")} className="w-full">
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const availableTerms = provider.available_terms || [3, 6, 12];
  const rate = provider.interest_rate_percent || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Installment Application</h1>
            <p className="text-xs text-muted-foreground">via {provider.name}</p>
          </div>
        </div>

        {/* Product Info */}
        <Card className="p-4 flex gap-3">
          {product.image_url ? (
            <img src={product.image_url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-muted shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-bold">{product.name}</p>
            <p className="text-sm text-muted-foreground">₱{product.base_price?.toLocaleString()}</p>
            <Badge className="mt-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-xs">
              {provider.name} · {rate}% interest
            </Badge>
          </div>
        </Card>

        {/* Term Selection */}
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Select Payment Term
          </h3>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger><SelectValue placeholder="Choose installment term" /></SelectTrigger>
            <SelectContent>
              {availableTerms.map((t: number) => (
                <SelectItem key={t} value={t.toString()}>
                  {t} months — ₱{Math.round(calcMonthly(product.base_price, rate, t)).toLocaleString()}/mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTerm && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between"><span>Monthly Payment</span><span className="font-bold">₱{Math.round(calcMonthly(product.base_price, rate, parseInt(selectedTerm))).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Total Amount</span><span className="font-bold">₱{Math.round(calcMonthly(product.base_price, rate, parseInt(selectedTerm)) * parseInt(selectedTerm)).toLocaleString()}</span></div>
              <div className="flex justify-between text-primary"><span>Downpayment (1st mo)</span><span className="font-bold">₱{Math.round(calcMonthly(product.base_price, rate, parseInt(selectedTerm))).toLocaleString()}</span></div>
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>Your Wallet</span><span>₱{walletBalance.toLocaleString()}</span>
              </div>
            </div>
          )}
        </Card>

        {/* KYC Form */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" /> Personal Information (KYC)
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Full Name *</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Juan Dela Cruz" />
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xxxxxxxxx" />
            </div>
            <div>
              <Label>Complete Address *</Label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="House/Lot, Street, Barangay, City, Province" rows={2} />
            </div>
            <div>
              <Label>Date of Birth *</Label>
              <Input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)} />
            </div>
            <div>
              <Label>Valid ID Type *</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger><SelectValue placeholder="Select ID type" /></SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ID Number *</Label>
              <Input value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" />
            </div>
          </div>
        </Card>

        {/* Document Uploads */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Document Uploads
          </h3>
          <div className="space-y-3">
            <FileUploadField label="ID Document (front & back) *" file={idDoc} onFileChange={setIdDoc} accept="image/*,.pdf" />
            <FileUploadField label="Selfie with ID *" file={selfie} onFileChange={setSelfie} accept="image/*" icon={<Camera className="w-4 h-4" />} />
            <FileUploadField label="Proof of Income (optional)" file={proofOfIncome} onFileChange={setProofOfIncome} accept="image/*,.pdf" />
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4" /> Payment Method for Downpayment
          </h3>
          <div className="space-y-2">
            {PAYMENT_METHODS.map(pm => (
              <label
                key={pm.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === pm.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={pm.value}
                  checked={paymentMethod === pm.value}
                  onChange={() => setPaymentMethod(pm.value)}
                  className="accent-primary"
                />
                <pm.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{pm.label}</span>
                {pm.value === "cash_wallet" && (
                  <Badge variant="outline" className="ml-auto text-xs">₱{walletBalance.toLocaleString()}</Badge>
                )}
              </label>
            ))}
          </div>

          {paymentMethod !== "cash_wallet" && (
            <div className="space-y-2 pt-2">
              <Label>Upload Payment Proof</Label>
              <FileUploadField label="Receipt / Screenshot" file={paymentProof} onFileChange={setPaymentProof} accept="image/*,.pdf" />
              <p className="text-xs text-muted-foreground">Upload your payment receipt or screenshot for verification.</p>
            </div>
          )}

          {paymentMethod === "cash_wallet" && (
            <p className="text-xs text-muted-foreground">
              The downpayment will be automatically deducted from your cash wallet upon admin approval.
            </p>
          )}
        </Card>

        {/* Submit */}
        <Button
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-12 text-base"
          onClick={handleSubmit}
          disabled={submitting || !selectedTerm}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {uploadingFiles ? "Uploading Documents..." : "Submitting..."}
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5 mr-2" />
              Submit Application
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          By submitting, you agree to the provider's terms and conditions. Your application will be reviewed by the admin.
        </p>
      </div>
    </div>
  );
};

// Reusable file upload component
const FileUploadField = ({
  label,
  file,
  onFileChange,
  accept,
  icon,
}: {
  label: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  accept?: string;
  icon?: React.ReactNode;
}) => (
  <div>
    <Label className="text-sm">{label}</Label>
    <label className="flex items-center gap-2 p-3 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors mt-1">
      {icon || <Upload className="w-4 h-4 text-muted-foreground" />}
      <span className="text-sm text-muted-foreground flex-1 truncate">
        {file ? file.name : "Tap to upload"}
      </span>
      {file && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={e => onFileChange(e.target.files?.[0] || null)}
      />
    </label>
  </div>
);

export default InstallmentApply;
