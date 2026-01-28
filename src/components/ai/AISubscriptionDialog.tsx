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
  id: string;
  type: string;
  key: string;
  name: string;
  price: number;
  credits: number;
  savings: number;
  label: string;
  icon: 'calendar' | 'hexagon' | 'crown';
}

interface DynamicTier {
  id: string;
  key: string;
  name: string;
  price: string;
  credits: string;
  icon: 'calendar' | 'hexagon' | 'crown';
}

const defaultTiers: DynamicTier[] = [
  { id: '1', key: 'monthly', name: 'Monthly Plan', price: '1390', credits: '500', icon: 'calendar' },
  { id: '2', key: 'biannual', name: '6-Month Plan', price: '6990', credits: '3500', icon: 'hexagon' },
  { id: '3', key: 'yearly', name: 'Yearly Plan', price: '11990', credits: '6000', icon: 'crown' },
];

export default function AISubscriptionDialog({ open, onOpenChange, onPurchaseComplete }: AISubscriptionDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [activeTab, setActiveTab] = useState<'subscription' | 'topup' | 'ads_package'>('subscription');
  const [paymentMethod, setPaymentMethod] = useState<'paymongo' | 'qrcode'>('paymongo');
  const [paymongoMethod, setPaymongoMethod] = useState<'gcash' | 'paymaya' | 'card'>('gcash');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [topupAmount, setTopupAmount] = useState(100);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [dynamicTiers, setDynamicTiers] = useState<DynamicTier[]>(defaultTiers);
  const [settings, setSettings] = useState({
    topupPricePerCredit: 3,
    topupMinCredits: 100,
    // Ads Package settings
    adsPackagePrice: 2500,
    adsPackageCredits: 300,
    adsPackageImpressions: 10000,
    adsPackageDays: 30,
    adsPackageEnabled: true
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
        .or('key.like.ai_%,key.like.payment_%,key.like.ads_package_%');

      // First, look for dynamic tiers
      const tiersData = data?.find(s => s.key === 'ai_subscription_tiers');
      if (tiersData?.value) {
        try {
          const parsedTiers = JSON.parse(tiersData.value);
          if (Array.isArray(parsedTiers) && parsedTiers.length > 0) {
            setDynamicTiers(parsedTiers);
            // Set default selected plan to first tier
            if (parsedTiers.length > 0) {
              setSelectedPlan(parsedTiers[0].key);
            }
          }
        } catch (e) {
          console.error('Error parsing tiers:', e);
        }
      }

      data?.forEach(setting => {
        if (setting.key === 'ai_topup_price_per_credit') {
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
        } else if (setting.key === 'ads_package_price') {
          setSettings(prev => ({ ...prev, adsPackagePrice: parseInt(setting.value || '2500') }));
        } else if (setting.key === 'ads_package_credits') {
          setSettings(prev => ({ ...prev, adsPackageCredits: parseInt(setting.value || '300') }));
        } else if (setting.key === 'ads_package_impressions') {
          setSettings(prev => ({ ...prev, adsPackageImpressions: parseInt(setting.value || '10000') }));
        } else if (setting.key === 'ads_package_days') {
          setSettings(prev => ({ ...prev, adsPackageDays: parseInt(setting.value || '30') }));
        } else if (setting.key === 'ads_package_enabled') {
          setSettings(prev => ({ ...prev, adsPackageEnabled: setting.value === 'true' }));
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

  // Build plans from dynamic tiers
  const plans: SubscriptionPlan[] = dynamicTiers.map((tier, index) => {
    const basePrice = parseInt(dynamicTiers[0]?.price || '1390');
    const tierPrice = parseInt(tier.price);
    const multiplier = index === 0 ? 1 : index === 1 ? 6 : 12;
    const savings = index > 0 ? Math.round(((basePrice * multiplier) - tierPrice) / (basePrice * multiplier) * 100) : 0;
    
    return {
      id: tier.id,
      type: tier.key,
      key: tier.key,
      name: tier.name,
      price: tierPrice,
      credits: parseInt(tier.credits),
      savings: Math.max(0, savings),
      label: tier.name,
      icon: tier.icon
    };
  });

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
          : selectedPlan === 'biannual'
          ? new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
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

  const handleAdsPackagePurchase = async () => {
    if (!user) {
      toast.error('Please login to purchase');
      return;
    }

    setPurchasing(true);
    try {
      if (paymentMethod === 'qrcode') {
        if (!referenceNumber.trim()) {
          toast.error('Please enter your payment reference number');
          setPurchasing(false);
          return;
        }

        // Create pending ads package purchase
        const { error } = await supabase.from('ai_credit_topups').insert({
          user_id: user.id,
          amount: settings.adsPackagePrice,
          credits_purchased: settings.adsPackageCredits,
          payment_method: 'qrcode',
          status: 'pending'
        });

        if (error) throw error;

        toast.success('AI + Ads Package request submitted! Awaiting admin approval.');
        setReferenceNumber('');
        onPurchaseComplete?.();
        onOpenChange(false);
      } else {
        // PayMongo payment
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            amount: settings.adsPackagePrice,
            paymentMethod: paymongoMethod,
            description: `AI + Ads Combo Package`,
            metadata: {
              user_id: user.id,
              purchase_type: 'ads_package',
              credits: settings.adsPackageCredits,
              impressions: settings.adsPackageImpressions,
              days: settings.adsPackageDays
            }
          }
        });

        if (error) throw error;

        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        }
      }
    } catch (error: any) {
      console.error('Ads package error:', error);
      toast.error(error.message || 'Failed to process purchase');
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
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="subscription" className="gap-2 text-xs">
                  <Calendar className="h-4 w-4" />
                  {currentSubscription ? 'Renew' : 'Subscribe'}
                </TabsTrigger>
                <TabsTrigger value="topup" className="gap-2 text-xs" disabled={!currentSubscription}>
                  <Plus className="h-4 w-4" />
                  Top-up
                </TabsTrigger>
                {settings.adsPackageEnabled && (
                  <TabsTrigger value="ads_package" className="gap-2 text-xs">
                    <Zap className="h-4 w-4" />
                    AI + Ads
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="subscription" className="space-y-6">
                {/* Plan Selection */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.type}
                      onClick={() => setSelectedPlan(plan.type)}
                      className={`relative cursor-pointer rounded-xl p-4 border-2 transition-all ${
                        selectedPlan === plan.type
                          ? plan.type === 'yearly' 
                            ? 'border-yellow-500 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 shadow-lg'
                            : plan.type === 'biannual'
                            ? 'border-purple-500 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-lg'
                            : 'border-blue-500 bg-blue-500/10 shadow-lg'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {plan.type === 'yearly' && (
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white border-0 text-xs">
                          Best Value
                        </Badge>
                      )}
                      {plan.savings > 0 && plan.type !== 'yearly' && (
                        <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                          Save {plan.savings}%
                        </Badge>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        {plan.type === 'yearly' ? (
                          <Star className="h-4 w-4 text-yellow-500" />
                        ) : plan.type === 'biannual' ? (
                          <Zap className="h-4 w-4 text-purple-500" />
                        ) : (
                          <Calendar className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-bold text-sm">{plan.label}</span>
                        {selectedPlan === plan.type && <Check className="h-4 w-4 ml-auto text-primary" />}
                      </div>

                      <div className="mb-2">
                        <span className="text-xl font-bold">₱{plan.price.toLocaleString()}</span>
                        <span className="text-muted-foreground text-xs">
                          /{plan.type === 'monthly' ? 'month' : plan.type === 'biannual' ? '6mo' : 'year'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span>{plan.credits.toLocaleString()} credits</span>
                      </div>

                      {plan.type === 'yearly' && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          All features unlocked
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

              {/* Ads Package Tab */}
              {settings.adsPackageEnabled && (
                <TabsContent value="ads_package" className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <Zap className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <h4 className="font-bold">AI + Ads Combo Package</h4>
                        <p className="text-sm text-muted-foreground">AI credits + Ads promotion with AI Beehives entry</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-background/50 rounded-lg text-center">
                        <Sparkles className="h-5 w-5 mx-auto mb-1 text-purple-500" />
                        <p className="text-lg font-bold">{settings.adsPackageCredits.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">AI Credits</p>
                      </div>
                      <div className="p-3 bg-background/50 rounded-lg text-center">
                        <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                        <p className="text-lg font-bold">{settings.adsPackageImpressions.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Ad Impressions</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Duration: {settings.adsPackageDays} days</span>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">₱{settings.adsPackagePrice.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">+ AI Beehives Entry</p>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm mb-4">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Use AI credits for content creation
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Promote your products/services inside TriviaBees
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        Automatic entry to AI Beehives for commissions
                      </li>
                    </ul>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-4">
                    <Label>Payment Method</Label>
                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                      <div className="grid grid-cols-2 gap-3">
                        <Label
                          htmlFor="paymongo-ads"
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                            paymentMethod === 'paymongo' ? 'border-orange-500 bg-orange-500/10' : 'border-border'
                          }`}
                        >
                          <RadioGroupItem value="paymongo" id="paymongo-ads" />
                          <CreditCard className="h-4 w-4" />
                          <span className="text-sm">Online Payment</span>
                        </Label>
                        <Label
                          htmlFor="qrcode-ads"
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer ${
                            paymentMethod === 'qrcode' ? 'border-orange-500 bg-orange-500/10' : 'border-border'
                          }`}
                        >
                          <RadioGroupItem value="qrcode" id="qrcode-ads" />
                          <QrCode className="h-4 w-4" />
                          <span className="text-sm">QR/Bank</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {paymentMethod === 'qrcode' && (
                    <div className="space-y-4">
                      {qrCodeUrl && (
                        <div className="flex justify-center">
                          <img src={qrCodeUrl} alt="Payment QR" className="w-48 h-48 rounded-lg" />
                        </div>
                      )}
                      
                      {bankDetails.bankName && (
                        <div className="space-y-2 p-4 bg-muted rounded-lg">
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-sm font-medium">Amount to Pay</span>
                            <span className="font-bold text-lg">₱{settings.adsPackagePrice.toLocaleString()}</span>
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
                    className="w-full gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    size="lg"
                    onClick={handleAdsPackagePurchase}
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    Buy AI + Ads Package
                  </Button>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}