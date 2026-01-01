import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Building2, Wallet, QrCode, Upload, Copy, Check, ArrowRight } from 'lucide-react';
import browserImageCompression from 'browser-image-compression';

interface CashDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export default function CashDepositDialog({ open, onOpenChange, userId, onSuccess }: CashDepositDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank');
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: paymentSettings = {} } = useQuery({
    queryKey: ['payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_revenue_settings')
        .select('*')
        .in('setting_key', [
          'bank_name', 'bank_account_holder', 'bank_account_number',
          'ewallet_name', 'ewallet_number', 'ewallet_holder',
          'qr_code_image_url', 'payment_instructions'
        ]);
      if (error) throw error;
      const settings: Record<string, string> = {};
      data?.forEach((s) => {
        settings[s.setting_key] = s.setting_value || '';
      });
      return settings;
    },
    enabled: open,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      let proofUrl = '';
      
      if (proofFile) {
        setUploading(true);
        try {
          const compressed = await browserImageCompression(proofFile, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
          });
          
          const fileExt = proofFile.name.split('.').pop();
          const fileName = `deposit-${userId}-${Date.now()}.${fileExt}`;
          const filePath = `deposit-proofs/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('ads')
            .upload(filePath, compressed);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('ads')
            .getPublicUrl(filePath);

          proofUrl = urlData.publicUrl;
        } finally {
          setUploading(false);
        }
      }

      const { error } = await supabase.from('cash_deposit_requests').insert({
        user_id: userId,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_proof_url: proofUrl,
        sender_name: senderName,
        sender_account: senderAccount,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deposits'] });
      toast.success('Deposit request submitted! Waiting for admin approval.');
      resetForm();
      onSuccess();
      onOpenChange(false);
    },
    onError: () => toast.error('Failed to submit deposit request'),
  });

  const resetForm = () => {
    setStep(1);
    setAmount('');
    setPaymentMethod('bank');
    setSenderName('');
    setSenderAccount('');
    setPaymentReference('');
    setProofFile(null);
    setProofPreview('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const canProceed = () => {
    if (step === 1) return parseFloat(amount) > 0;
    if (step === 2) return paymentMethod;
    if (step === 3) return senderName && paymentReference && proofFile;
    return true;
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Deposit Cash
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-12 h-1 ${step > s ? 'bg-emerald-500' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Amount */}
        {step === 1 && (
          <div className="space-y-4">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-emerald-700 dark:text-emerald-300">Enter Amount</CardTitle>
                <CardDescription>How much would you like to deposit?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-emerald-600">₱</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-2xl h-14 font-semibold border-emerald-300 focus:border-emerald-500"
                    min="1"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  {[100, 500, 1000, 5000].map((preset) => (
                    <Button
                      key={preset}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(preset.toString())}
                      className="flex-1 border-emerald-300 hover:bg-emerald-100"
                    >
                      ₱{preset}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Payment Method */}
        {step === 2 && (
          <div className="space-y-4">
            <Tabs value={paymentMethod} onValueChange={setPaymentMethod}>
              <TabsList className="grid w-full grid-cols-3 bg-emerald-100 dark:bg-emerald-900/30">
                <TabsTrigger value="bank" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                  <Building2 className="w-4 h-4 mr-1" />
                  Bank
                </TabsTrigger>
                <TabsTrigger value="ewallet" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <Wallet className="w-4 h-4 mr-1" />
                  E-Wallet
                </TabsTrigger>
                <TabsTrigger value="qr" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                  <QrCode className="w-4 h-4 mr-1" />
                  QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="bank">
                <Card className="border-emerald-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Bank Transfer Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow 
                      label="Bank Name" 
                      value={paymentSettings.bank_name || 'Not configured'}
                      onCopy={() => copyToClipboard(paymentSettings.bank_name, 'bank_name')}
                      copied={copied === 'bank_name'}
                    />
                    <DetailRow 
                      label="Account Name" 
                      value={paymentSettings.bank_account_holder || 'Not configured'}
                      onCopy={() => copyToClipboard(paymentSettings.bank_account_holder, 'bank_account_holder')}
                      copied={copied === 'bank_account_holder'}
                    />
                    <DetailRow 
                      label="Account Number" 
                      value={paymentSettings.bank_account_number || 'Not configured'}
                      onCopy={() => copyToClipboard(paymentSettings.bank_account_number, 'bank_account_number')}
                      copied={copied === 'bank_account_number'}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ewallet">
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">E-Wallet Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DetailRow 
                      label="Service" 
                      value={paymentSettings.ewallet_name || 'Not configured'}
                      onCopy={() => copyToClipboard(paymentSettings.ewallet_name, 'ewallet_name')}
                      copied={copied === 'ewallet_name'}
                    />
                    <DetailRow 
                      label="Phone Number" 
                      value={paymentSettings.ewallet_number || 'Not configured'}
                      onCopy={() => copyToClipboard(paymentSettings.ewallet_number, 'ewallet_number')}
                      copied={copied === 'ewallet_number'}
                    />
                    <DetailRow 
                      label="Account Name" 
                      value={paymentSettings.ewallet_holder || 'Not configured'}
                      onCopy={() => copyToClipboard(paymentSettings.ewallet_holder, 'ewallet_holder')}
                      copied={copied === 'ewallet_holder'}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qr">
                <Card className="border-purple-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Scan QR Code</CardTitle>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {paymentSettings.qr_code_image_url ? (
                      <img 
                        src={paymentSettings.qr_code_image_url} 
                        alt="Payment QR Code" 
                        className="w-48 h-48 object-contain border rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                        QR Code not configured
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {paymentSettings.payment_instructions && (
              <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-900/20">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Instructions:</strong> {paymentSettings.payment_instructions}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                <strong>Amount to send:</strong> ₱{parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <Card className="border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Payment Confirmation</CardTitle>
                <CardDescription>Fill in your payment details and upload proof</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Your Name (as shown in payment)</Label>
                  <Input 
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                  />
                </div>
                <div>
                  <Label>Your Account/Number</Label>
                  <Input 
                    value={senderAccount}
                    onChange={(e) => setSenderAccount(e.target.value)}
                    placeholder="e.g., 09171234567 or account number"
                  />
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <Input 
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Transaction reference number"
                  />
                </div>
                <div>
                  <Label>Proof of Payment</Label>
                  <div className="mt-2">
                    {proofPreview ? (
                      <div className="relative">
                        <img src={proofPreview} alt="Proof" className="w-full max-h-48 object-contain rounded-lg border" />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => { setProofFile(null); setProofPreview(''); }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Label htmlFor="proof-upload" className="cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
                        </div>
                        <Input
                          id="proof-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </Label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50 dark:bg-green-900/20">
              <CardContent className="pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Deposit Amount</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₱{parseFloat(amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-2 pt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!canProceed() || submitMutation.isPending || uploading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              {(submitMutation.isPending || uploading) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Deposit Request'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/50">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onCopy}>
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}
