import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, CreditCard, Building2, QrCode, Wallet, Upload, X, Image } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RevenueSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

interface AdPaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_KEYS = [
  'bank_name',
  'bank_account_holder',
  'bank_account_number',
  'ewallet_name',
  'ewallet_number',
  'ewallet_holder',
  'qr_code_image_url',
  'payment_instructions',
];

export default function AdPaymentDetailsDialog({ open, onOpenChange }: AdPaymentDetailsDialogProps) {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const { data: paymentSettings = [], isLoading } = useQuery({
    queryKey: ['ad-payment-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_revenue_settings')
        .select('*')
        .in('setting_key', PAYMENT_KEYS);
      if (error) throw error;
      return data as RevenueSetting[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (paymentSettings.length > 0) {
      const settings: Record<string, string> = {};
      paymentSettings.forEach((s) => {
        settings[s.setting_key] = s.setting_value || '';
      });
      setLocalSettings(settings);
    }
  }, [paymentSettings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: { key: string; value: string }[]) => {
      for (const { key, value } of updates) {
        const existing = paymentSettings.find((s) => s.setting_key === key);
        if (existing) {
          const { error } = await supabase
            .from('ad_revenue_settings')
            .update({ setting_value: value, updated_at: new Date().toISOString() })
            .eq('setting_key', key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('ad_revenue_settings')
            .insert({
              setting_key: key,
              setting_value: value,
              description: getDescription(key),
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-payment-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ad-revenue-settings'] });
      toast.success('Payment details saved successfully');
    },
    onError: () => toast.error('Failed to save payment details'),
  });

  const getDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      bank_name: 'Bank name for transfers',
      bank_account_holder: 'Bank account holder name',
      bank_account_number: 'Bank account number',
      ewallet_name: 'E-wallet service name (GCash, Maya, etc.)',
      ewallet_number: 'E-wallet phone number',
      ewallet_holder: 'E-wallet account holder name',
      qr_code_image_url: 'QR code image for payments',
      payment_instructions: 'Additional payment instructions',
    };
    return descriptions[key] || '';
  };

  const handleSaveAll = () => {
    const updates = Object.entries(localSettings).map(([key, value]) => ({ key, value }));
    updateMutation.mutate(updates);
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-code-${Date.now()}.${fileExt}`;
      const filePath = `payment-qr/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('ads')
        .getPublicUrl(filePath);

      setLocalSettings((prev) => ({ ...prev, qr_code_image_url: urlData.publicUrl }));
      toast.success('QR code uploaded');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload QR code');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Payment Details Management
            </span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <Tabs defaultValue="bank" className="mt-4">
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-amber-100 via-orange-100 to-red-100 dark:from-amber-900/30 dark:via-orange-900/30 dark:to-red-900/30 p-1 rounded-xl">
              <TabsTrigger 
                value="bank"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white rounded-lg"
              >
                <Building2 className="w-4 h-4 mr-1" />
                Bank
              </TabsTrigger>
              <TabsTrigger 
                value="ewallet"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg"
              >
                <Wallet className="w-4 h-4 mr-1" />
                E-Wallet
              </TabsTrigger>
              <TabsTrigger 
                value="qr"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white rounded-lg"
              >
                <QrCode className="w-4 h-4 mr-1" />
                QR Code
              </TabsTrigger>
            </TabsList>

            {/* Bank Details Tab */}
            <TabsContent value="bank" className="mt-4 space-y-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-background">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-lg">
                    <Building2 className="w-5 h-5" />
                    Bank Account Details
                  </CardTitle>
                  <CardDescription>Configure bank account for manual payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-amber-700 dark:text-amber-300">Bank Name</Label>
                    <Input
                      placeholder="e.g., BDO, BPI, Metrobank"
                      value={localSettings.bank_name || ''}
                      onChange={(e) => setLocalSettings((prev) => ({ ...prev, bank_name: e.target.value }))}
                      className="border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-700 dark:text-amber-300">Account Holder Name</Label>
                    <Input
                      placeholder="Full name as registered"
                      value={localSettings.bank_account_holder || ''}
                      onChange={(e) => setLocalSettings((prev) => ({ ...prev, bank_account_holder: e.target.value }))}
                      className="border-amber-200 focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-700 dark:text-amber-300">Account Number</Label>
                    <Input
                      placeholder="Bank account number"
                      value={localSettings.bank_account_number || ''}
                      onChange={(e) => setLocalSettings((prev) => ({ ...prev, bank_account_number: e.target.value }))}
                      className="border-amber-200 focus:border-amber-400"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* E-Wallet Tab */}
            <TabsContent value="ewallet" className="mt-4 space-y-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-background">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300 text-lg">
                    <Wallet className="w-5 h-5" />
                    E-Wallet Details
                  </CardTitle>
                  <CardDescription>Configure e-wallet for manual payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-orange-700 dark:text-orange-300">E-Wallet Service</Label>
                    <Input
                      placeholder="e.g., GCash, Maya, PayMaya"
                      value={localSettings.ewallet_name || ''}
                      onChange={(e) => setLocalSettings((prev) => ({ ...prev, ewallet_name: e.target.value }))}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label className="text-orange-700 dark:text-orange-300">Phone Number</Label>
                    <Input
                      placeholder="e.g., 09171234567"
                      value={localSettings.ewallet_number || ''}
                      onChange={(e) => setLocalSettings((prev) => ({ ...prev, ewallet_number: e.target.value }))}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div>
                    <Label className="text-orange-700 dark:text-orange-300">Account Holder Name</Label>
                    <Input
                      placeholder="Registered name"
                      value={localSettings.ewallet_holder || ''}
                      onChange={(e) => setLocalSettings((prev) => ({ ...prev, ewallet_holder: e.target.value }))}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* QR Code Tab */}
            <TabsContent value="qr" className="mt-4 space-y-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-background">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300 text-lg">
                    <QrCode className="w-5 h-5" />
                    QR Code for Payments
                  </CardTitle>
                  <CardDescription>Upload a QR code image for quick payments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center gap-4">
                    {localSettings.qr_code_image_url ? (
                      <div className="relative">
                        <img
                          src={localSettings.qr_code_image_url}
                          alt="Payment QR Code"
                          className="w-48 h-48 object-contain border-2 border-red-200 rounded-lg shadow-md"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6"
                          onClick={() => setLocalSettings((prev) => ({ ...prev, qr_code_image_url: '' }))}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20">
                        <Image className="w-12 h-12 text-red-300" />
                        <p className="text-sm text-muted-foreground mt-2">No QR code uploaded</p>
                      </div>
                    )}
                    
                    <div className="w-full">
                      <Label htmlFor="qr-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          {uploading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Upload className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-red-600">
                            {uploading ? 'Uploading...' : 'Upload QR Code Image'}
                          </span>
                        </div>
                        <Input
                          id="qr-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQrUpload}
                          disabled={uploading}
                        />
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Instructions - Always Visible */}
            <Card className="mt-4 border-0 shadow-md bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-background">
              <CardHeader className="pb-3">
                <CardTitle className="text-purple-700 dark:text-purple-300 text-lg">Payment Instructions</CardTitle>
                <CardDescription>Additional instructions shown to users</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Enter any additional payment instructions or notes..."
                  value={localSettings.payment_instructions || ''}
                  onChange={(e) => setLocalSettings((prev) => ({ ...prev, payment_instructions: e.target.value }))}
                  rows={3}
                  className="border-purple-200 focus:border-purple-400"
                />
              </CardContent>
            </Card>

            <Button
              className="w-full mt-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg"
              onClick={handleSaveAll}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save All Payment Details
                </>
              )}
            </Button>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
