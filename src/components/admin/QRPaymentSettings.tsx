import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, Building2, Save, Loader2, Upload, Trash2, Image } from 'lucide-react';

export default function QRPaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'payment_%');

      if (error) throw error;

      data?.forEach(setting => {
        if (setting.key === 'payment_qr_code_url') setQrCodeUrl(setting.value || '');
        if (setting.key === 'payment_bank_name') setBankName(setting.value || '');
        if (setting.key === 'payment_bank_account_name') setAccountName(setting.value || '');
        if (setting.key === 'payment_bank_account_number') setAccountNumber(setting.value || '');
      });
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'payment_qr_code_url', value: qrCodeUrl },
        { key: 'payment_bank_name', value: bankName },
        { key: 'payment_bank_account_name', value: accountName },
        { key: 'payment_bank_account_number', value: accountNumber },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({ key: update.key, value: update.value }, { onConflict: 'key' });
        if (error) throw error;
      }

      toast.success('Payment settings saved successfully!');
    } catch (error) {
      console.error('Error saving payment settings:', error);
      toast.error('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setQrCodeUrl(base64);
        setUploading(false);
        toast.success('QR code image uploaded!');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Payment Settings
          </CardTitle>
          <CardDescription>
            Configure QR code and bank transfer payment options for AI credit purchases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Upload */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Payment QR Code</Label>
            <div className="flex gap-4 items-start">
              <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Payment QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Image className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-xs">No QR code uploaded</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  id="qr-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('qr-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload QR Code
                </Button>
                {qrCodeUrl && (
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setQrCodeUrl('')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload your GCash, Maya, or any payment QR code (max 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Transfer Details
            </Label>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g., BDO, BPI, GCash"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  placeholder="e.g., Juan Dela Cruz"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="e.g., 1234567890"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Payment Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}