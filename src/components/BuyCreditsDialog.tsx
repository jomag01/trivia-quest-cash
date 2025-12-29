import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ShoppingBag, Gem, Gift, Banknote, Copy, Check, Loader2, ArrowLeft, QrCode, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaymentSettings {
  qrCodeUrl: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export const BuyCreditsDialog = ({ open, onOpenChange }: BuyCreditsDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState<'options' | 'deposit'>('options');
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    qrCodeUrl: '',
    bankName: '',
    accountName: '',
    accountNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'deposit') {
      fetchPaymentSettings();
    }
  }, [view]);

  const fetchPaymentSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'payment_%');

      if (error) throw error;

      const settings: PaymentSettings = {
        qrCodeUrl: '',
        bankName: '',
        accountName: '',
        accountNumber: ''
      };

      data?.forEach(setting => {
        if (setting.key === 'payment_qr_code_url') settings.qrCodeUrl = setting.value || '';
        if (setting.key === 'payment_bank_name') settings.bankName = setting.value || '';
        if (setting.key === 'payment_bank_account_name') settings.accountName = setting.value || '';
        if (setting.key === 'payment_bank_account_number') settings.accountNumber = setting.value || '';
      });

      setPaymentSettings(settings);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast.error('Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleShopClick = () => {
    onOpenChange(false);
    navigate("/shop");
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmitDeposit = async () => {
    if (!user) {
      toast.error('Please log in to submit a deposit');
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid deposit amount');
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error('Please enter the payment reference number');
      return;
    }

    setSubmitting(true);
    try {
      // Get credit to diamond conversion rate from settings
      const { data: conversionSetting } = await supabase
        .from('treasure_admin_settings')
        .select('setting_value')
        .eq('setting_key', 'credit_to_diamond_rate')
        .maybeSingle();
      
      const creditToDiamondRate = parseFloat(conversionSetting?.setting_value || '10');
      const credits = Math.floor(amount);
      const diamondsFromPurchase = Math.floor(credits / creditToDiamondRate);

      const { error } = await supabase
        .from('credit_purchases')
        .insert({
          user_id: user.id,
          amount,
          credits,
          payment_method: 'bank_deposit',
          reference_number: referenceNumber.trim(),
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Deposit submitted! Awaiting admin approval.');
      setDepositAmount('');
      setReferenceNumber('');
      setView('options');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting deposit:', error);
      toast.error('Failed to submit deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setView('options');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="w-6 h-6 text-primary" />
            {view === 'options' ? 'Earn Gems & Diamonds' : 'Direct Deposit'}
          </DialogTitle>
          <DialogDescription>
            {view === 'options' 
              ? 'Choose how you want to get credits and diamonds!'
              : 'Deposit via GCash or Bank Transfer'}
          </DialogDescription>
        </DialogHeader>

        {view === 'options' ? (
          <div className="space-y-4 py-4">
            {/* Option 1: Shop */}
            <Card 
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={handleShopClick}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-orange-400 to-pink-500">
                  <ShoppingBag className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Buy from Shop</h3>
                  <p className="text-sm text-muted-foreground">
                    Purchase merchandise and earn diamonds with every order!
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Gift className="w-3 h-3" />
                    <span>Get diamonds + physical products</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Option 2: Direct Deposit */}
            <Card 
              className="p-4 cursor-pointer hover:border-primary transition-colors"
              onClick={() => setView('deposit')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Direct Cash Deposit</h3>
                  <p className="text-sm text-muted-foreground">
                    Pay via GCash or bank transfer for instant credits!
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <QrCode className="w-3 h-3" />
                    <span>GCash • Bank Transfer</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setView('options')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* QR Code */}
                {paymentSettings.qrCodeUrl && (
                  <div className="text-center space-y-2">
                    <Label className="text-sm font-medium">Scan QR Code to Pay</Label>
                    <div className="w-48 h-48 mx-auto border rounded-lg overflow-hidden bg-white">
                      <img 
                        src={paymentSettings.qrCodeUrl} 
                        alt="Payment QR Code" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Bank Details */}
                {(paymentSettings.bankName || paymentSettings.accountName || paymentSettings.accountNumber) && (
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">Bank Transfer Details</span>
                    </div>
                    
                    {paymentSettings.bankName && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Bank Name</p>
                          <p className="font-medium">{paymentSettings.bankName}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleCopy(paymentSettings.bankName, 'bank')}
                        >
                          {copiedField === 'bank' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}

                    {paymentSettings.accountName && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Account Name</p>
                          <p className="font-medium">{paymentSettings.accountName}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleCopy(paymentSettings.accountName, 'name')}
                        >
                          {copiedField === 'name' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}

                    {paymentSettings.accountNumber && (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Account Number</p>
                          <p className="font-medium font-mono">{paymentSettings.accountNumber}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleCopy(paymentSettings.accountNumber, 'number')}
                        >
                          {copiedField === 'number' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Deposit Form */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Deposit Amount (₱)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                    {depositAmount && !isNaN(parseFloat(depositAmount)) && (
                      <p className="text-xs text-muted-foreground">
                        You will receive {Math.floor(parseFloat(depositAmount))} credits
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Payment Reference Number</Label>
                    <Input
                      id="reference"
                      placeholder="Enter GCash/Bank reference number"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the reference number from your payment receipt
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSubmitDeposit}
                    disabled={submitting || !depositAmount || !referenceNumber}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Banknote className="w-4 h-4 mr-2" />
                        Submit Deposit
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Your deposit will be reviewed and credited within 24 hours
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
