import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Sparkles, Check, Loader2, Wallet, Calendar, Zap, Star, QrCode, Copy, CheckCircle2, Plus, CreditCard } from 'lucide-react';

interface AISubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

interface SubscriptionPlan {
  type: 'monthly' | 'yearly';
  price: number;
  credits: number;
  savings: number;
}

export default function AISubscriptionDialog({ open, onOpenChange, onPurchaseComplete }: AISubscriptionDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState<'subscription' | 'topup'>('subscription');
  const [paymentMethod, setPaymentMethod] = useState<'paymongo' | 'qrcode'>('paymongo');
  const [paymongoMethod, setPaymongoMethod] = useState<'gcash' | 'paymaya' | 'card'>('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [topupAmount, setTopupAmount] = useState(100);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [settings, setSettings] = useState({
    monthlyPrice: 1390,
    yearlyPrice: 11990,
    monthlyCredits: 500,
    yearlyCredits: 6000,
    topupPricePerCredit: 3,
    topupMinCredits: 100
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchCurrentSubscription();
    }
  }, [open, user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .or('key.like.ai_subscription_%,key.like.payment_%');

      data?.forEach(setting => {
        if (setting.key === 'ai_subscription_monthly_price') {
          setSettings(prev => ({ ...prev, monthlyPrice: parseInt(setting.value || '1390') }));
        } else if (setting.key === 'ai_subscription_yearly_price') {
          setSettings(prev => ({ ...prev, yearlyPrice: parseInt(setting.value || '11990') }));
        } else if (setting.key === 'ai_subscription_monthly_credits') {
          setSettings(prev => ({ ...prev, monthlyCredits: parseInt(setting.value || '500') }));
        } else if (setting.key === 'ai_subscription_yearly_credits') {
          setSettings(prev => ({ ...prev, yearlyCredits: parseInt(setting.value || '6000') }));
        } else if (setting.key === 'ai_topup_price_per_credit') {
          setSettings(prev => ({ ...prev, topupPricePerCredit: parseFloat(setting.value || '3') }));
        } else if (setting.key === 'ai_topup_min_credits') {
          setSettings(prev => ({ ...prev, topupMinCredits: parseInt(setting.value || '100') }));
        } else if (setting.key === 'payment_qr_code_url') {
          setQrCodeUrl(setting.value || '');
        } else if (setting.key === 'payment_bank_account_name') {
          setBankDetails(prev => ({ ...prev, accountName: setting.value || '' }));
        } else if (setting.key === 'payment_bank_account_number') {
          setBankDetails(prev => ({ ...prev, accountNumber: setting.value || '' }));
        } else if (setting.key === 'payment_bank_name') {
          setBankDetails(prev => ({ ...prev, bankName: setting.value || '' }));
        }
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('ai_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const plans: SubscriptionPlan[] = [
    {
      type: 'monthly',
      price: settings.monthlyPrice,
      credits: settings.monthlyCredits,
      savings: 0
    },
    {
      type: 'yearly',
      price: settings.yearlyPrice,
      credits: settings.yearlyCredits,
      savings: Math.round(((settings.monthlyPrice * 12) - settings.yearlyPrice) / (settings.monthlyPrice * 12) * 100)
    }
  ];

  const handleSubscribe = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }

    const plan = plans.find(p => p.type === selectedPlan);
    if (!plan) return;

    setPurchasing(true);
    try {
      if (paymentMethod === 'qrcode') {
        if (!referenceNumber.trim()) {
          toast.error('Please enter your payment reference number');
          setPurchasing(false);
          return;
        }

        // Create pending subscription
        const expiresAt = selectedPlan === 'monthly' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

        const { error } = await supabase.from('ai_subscriptions').insert({
          user_id: user.id,
          plan_type: selectedPlan,
          status: 'pending',
          credits_remaining: 0,
          expires_at: expiresAt.toISOString(),
          amount_paid: plan.price,
          payment_method: 'qrcode',
          payment_reference: referenceNumber
        });

        if (error) throw error;

        toast.success('Subscription request submitted! Awaiting admin approval.');
        setReferenceNumber('');
        onPurchaseComplete?.();
        onOpenChange(false);
      } else {
        // PayMongo payment
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            amount: plan.price,
            paymentMethod: paymongoMethod,
            description: `AI Hub ${selectedPlan} Subscription`,
            metadata: {
              user_id: user.id,
              purchase_type: 'ai_subscription',
              plan_type: selectedPlan,
              credits: plan.credits
            }
          }
        });

        if (error) throw error;

        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        }
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast.error(error.message || 'Failed to process subscription');
    } finally {
      setPurchasing(false);
    }
  };

  const handleTopup = async () => {
    if (!user) {
      toast.error('Please login to top up');
      return;
    }

    if (!currentSubscription) {
      toast.error('You need an active subscription to top up credits');
      return;
    }

    if (topupAmount < settings.topupMinCredits) {
      toast.error(`Minimum top-up is ${settings.topupMinCredits} credits`);
      return;
    }

    const totalPrice = topupAmount * settings.topupPricePerCredit;

    setPurchasing(true);
    try {
      if (paymentMethod === 'qrcode') {
        if (!referenceNumber.trim()) {
          toast.error('Please enter your payment reference number');
          setPurchasing(false);
          return;
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', user.id)
          .single();

        const { error } = await supabase.from('ai_credit_topups').insert({
          user_id: user.id,
          subscription_id: currentSubscription.id,
          amount: totalPrice,
          credits_purchased: topupAmount,
          payment_method: 'qrcode',
          payment_reference: referenceNumber,
          status: 'pending',
          referrer_id: profileData?.referred_by || null
        });

        if (error) throw error;

        toast.success('Top-up request submitted! Awaiting admin approval.');
        setReferenceNumber('');
        onPurchaseComplete?.();
        onOpenChange(false);
      } else {
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            amount: totalPrice,
            paymentMethod: paymongoMethod,
            description: `AI Credits Top-up - ${topupAmount} credits`,
            metadata: {
              user_id: user.id,
              purchase_type: 'ai_topup',
              credits: topupAmount,
              subscription_id: currentSubscription.id
            }
          }
        });

        if (error) throw error;

        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        }
      }
    } catch (error: any) {
      console.error('Top-up error:', error);
      toast.error(error.message || 'Failed to process top-up');
    } finally {
      setPurchasing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const selectedPlanData = plans.find(p => p.type === selectedPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 p-6 rounded-t-lg">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Crown className="h-6 w-6 text-yellow-400" />
              AI Hub Subscription
            </DialogTitle>
            <DialogDescription className="text-purple-200">
              {currentSubscription 
                ? `Current Plan: ${currentSubscription.plan_type} • ${currentSubscription.credits_remaining} credits remaining`
                : 'Unlock all AI features with a subscription'
              }
            </DialogDescription>
          </DialogHeader>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="subscription" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {currentSubscription ? 'Renew' : 'Subscribe'}
                </TabsTrigger>
                <TabsTrigger value="topup" className="gap-2" disabled={!currentSubscription}>
                  <Plus className="h-4 w-4" />
                  Top-up Credits
                </TabsTrigger>
              </TabsList>

              <TabsContent value="subscription" className="space-y-6">
                {/* Plan Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plans.map((plan) => (
                    <div
                      key={plan.type}
                      onClick={() => setSelectedPlan(plan.type)}
                      className={`relative cursor-pointer rounded-xl p-5 border-2 transition-all ${
                        selectedPlan === plan.type
                          ? 'border-purple-500 bg-purple-500/10 shadow-lg'
                          : 'border-border hover:border-purple-400/50'
                      }`}
                    >
                      {plan.savings > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                          Save {plan.savings}%
                        </Badge>
                      )}

                      <div className="flex items-center gap-2 mb-3">
                        {plan.type === 'yearly' ? (
                          <Star className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <Calendar className="h-5 w-5 text-blue-500" />
                        )}
                        <span className="font-bold capitalize">{plan.type}</span>
                        {selectedPlan === plan.type && <Check className="h-5 w-5 ml-auto text-purple-500" />}
                      </div>

                      <div className="mb-3">
                        <span className="text-2xl font-bold">₱{plan.price.toLocaleString()}</span>
                        <span className="text-muted-foreground">/{plan.type === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        <span>{plan.credits.toLocaleString()} credits</span>
                      </div>

                      {plan.type === 'yearly' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          All AI features unlocked
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Payment Method */}
                <div className="space-y-4">
                  <Label>Payment Method</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                    <div className="grid grid-cols-2 gap-3">
                      <Label
                        htmlFor="paymongo"
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                          paymentMethod === 'paymongo' ? 'border-purple-500 bg-purple-500/10' : 'border-border'
                        }`}
                      >
                        <RadioGroupItem value="paymongo" id="paymongo" />
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm">Online Payment</span>
                      </Label>
                      <Label
                        htmlFor="qrcode"
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                          paymentMethod === 'qrcode' ? 'border-purple-500 bg-purple-500/10' : 'border-border'
                        }`}
                      >
                        <RadioGroupItem value="qrcode" id="qrcode" />
                        <QrCode className="h-4 w-4" />
                        <span className="text-sm">QR/Bank</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentMethod === 'paymongo' && (
                  <div className="space-y-3">
                    <Label>Select E-Wallet/Card</Label>
                    <RadioGroup value={paymongoMethod} onValueChange={(v) => setPaymongoMethod(v as any)}>
                      <div className="grid grid-cols-3 gap-2">
                        {['gcash', 'paymaya', 'card'].map((method) => (
                          <Label
                            key={method}
                            htmlFor={method}
                            className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm ${
                              paymongoMethod === method ? 'border-purple-500 bg-purple-500/10' : 'border-border'
                            }`}
                          >
                            <RadioGroupItem value={method} id={method} className="sr-only" />
                            {method === 'gcash' ? 'GCash' : method === 'paymaya' ? 'Maya' : 'Card'}
                          </Label>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {paymentMethod === 'qrcode' && (
                  <div className="space-y-4">
                    {qrCodeUrl && (
                      <div className="flex justify-center">
                        <img src={qrCodeUrl} alt="Payment QR" className="w-48 h-48 rounded-lg" />
                      </div>
                    )}
                    
                    {bankDetails.bankName && (
                      <div className="space-y-2 p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Bank</span>
                          <span className="font-medium">{bankDetails.bankName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Account Name</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bankDetails.accountName}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(bankDetails.accountName, 'name')}
                            >
                              {copiedField === 'name' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Account Number</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{bankDetails.accountNumber}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(bankDetails.accountNumber, 'number')}
                            >
                              {copiedField === 'number' ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">Amount to Pay</span>
                          <span className="font-bold text-lg">₱{selectedPlanData?.price.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Payment Reference Number</Label>
                      <Input
                        placeholder="Enter reference number after payment"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleSubscribe}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {currentSubscription ? 'Renew Subscription' : 'Subscribe Now'}
                </Button>
              </TabsContent>

              <TabsContent value="topup" className="space-y-6">
                {!currentSubscription ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">You need an active subscription to top up credits</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Current Credits</span>
                        <span className="font-bold">{currentSubscription.credits_remaining.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Price per Credit</span>
                        <span className="font-medium">₱{settings.topupPricePerCredit}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Credits to Purchase (min {settings.topupMinCredits})</Label>
                      <Input
                        type="number"
                        min={settings.topupMinCredits}
                        step={100}
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(Math.max(settings.topupMinCredits, parseInt(e.target.value) || 0))}
                      />
                      <p className="text-sm text-muted-foreground">
                        Total: ₱{(topupAmount * settings.topupPricePerCredit).toLocaleString()}
                      </p>
                    </div>

                    {/* Payment Method (same as subscription) */}
                    <div className="space-y-4">
                      <Label>Payment Method</Label>
                      <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                        <div className="grid grid-cols-2 gap-3">
                          <Label
                            htmlFor="paymongo-topup"
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                              paymentMethod === 'paymongo' ? 'border-purple-500 bg-purple-500/10' : 'border-border'
                            }`}
                          >
                            <RadioGroupItem value="paymongo" id="paymongo-topup" />
                            <CreditCard className="h-4 w-4" />
                            <span className="text-sm">Online Payment</span>
                          </Label>
                          <Label
                            htmlFor="qrcode-topup"
                            className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                              paymentMethod === 'qrcode' ? 'border-purple-500 bg-purple-500/10' : 'border-border'
                            }`}
                          >
                            <RadioGroupItem value="qrcode" id="qrcode-topup" />
                            <QrCode className="h-4 w-4" />
                            <span className="text-sm">QR/Bank</span>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {paymentMethod === 'qrcode' && (
                      <div className="space-y-4">
                        {bankDetails.bankName && (
                          <div className="space-y-2 p-4 bg-muted rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Amount to Pay</span>
                              <span className="font-bold">₱{(topupAmount * settings.topupPricePerCredit).toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Payment Reference Number</Label>
                          <Input
                            placeholder="Enter reference number after payment"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full gap-2"
                      size="lg"
                      onClick={handleTopup}
                      disabled={purchasing || topupAmount < settings.topupMinCredits}
                    >
                      {purchasing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Top-up {topupAmount.toLocaleString()} Credits
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}