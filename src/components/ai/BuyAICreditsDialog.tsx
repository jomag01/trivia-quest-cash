import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, ImageIcon, VideoIcon, Sparkles, Check, Loader2, CreditCard, Wallet, ArrowUp, Smartphone, Building2, Zap, Star, Timer, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TierUpgradeDialog from './TierUpgradeDialog';

interface CreditTier {
  price: number;
  credits: number;
  images: number;
  videos: number;
  dailyCap: number;
}

interface BuyAICreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchaseComplete?: () => void;
}

export default function BuyAICreditsDialog({ open, onOpenChange, onPurchaseComplete }: BuyAICreditsDialogProps) {
  const { user, profile } = useAuth();
  const [tiers, setTiers] = useState<CreditTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'paymongo' | 'qrcode'>('paymongo');
  const [paymongoMethod, setPaymongoMethod] = useState<'gcash' | 'paymaya' | 'card' | 'grab_pay'>('gcash');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showQrSuccess, setShowQrSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const [currentUserTier, setCurrentUserTier] = useState<number>(-1);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 8, minutes: 59, seconds: 59 });
  const [commissionSettings, setCommissionSettings] = useState({
    adminPercent: 35,
    unilevelPercent: 40,
    stairstepPercent: 35,
    leadershipPercent: 25
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchUserCredits();
      fetchUserTier();
    }
  }, [open]);

  // Countdown timer effect
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; minutes = 59; seconds = 59; }
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  const fetchUserCredits = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      setUserCredits(data?.credits || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchUserTier = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('binary_ai_purchases')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        const tierIndex = tiers.findIndex(t => t.price === data.amount);
        setCurrentUserTier(tierIndex >= 0 ? tierIndex : -1);
      }
    } catch (error) {
      console.error('Error fetching user tier:', error);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .or('key.like.ai_%,key.like.binary_%');

      const tierData: CreditTier[] = [
        { price: 100, credits: 50, images: 30, videos: 10, dailyCap: 5000 },
        { price: 250, credits: 150, images: 100, videos: 30, dailyCap: 10000 },
        { price: 500, credits: 400, images: 300, videos: 80, dailyCap: 20000 }
      ];

      data?.forEach(setting => {
        const match = setting.key.match(/ai_credit_tier_(\d)_(\w+)/);
        if (match) {
          const tierIndex = parseInt(match[1]) - 1;
          const field = match[2];
          if (tierIndex >= 0 && tierIndex < 3) {
            if (field === 'price') tierData[tierIndex].price = parseInt(setting.value || '0');
            if (field === 'credits') tierData[tierIndex].credits = parseInt(setting.value || '0');
            if (field === 'image') tierData[tierIndex].images = parseInt(setting.value || '0');
            if (field === 'video') tierData[tierIndex].videos = parseInt(setting.value || '0');
            if (field === 'daily_cap') tierData[tierIndex].dailyCap = parseInt(setting.value || '5000');
          }
        }
        if (setting.key === 'ai_admin_earnings_percent') {
          setCommissionSettings(prev => ({ ...prev, adminPercent: parseInt(setting.value || '35') }));
        }
        if (setting.key === 'ai_unilevel_percent') {
          setCommissionSettings(prev => ({ ...prev, unilevelPercent: parseInt(setting.value || '40') }));
        }
        if (setting.key === 'ai_stairstep_percent') {
          setCommissionSettings(prev => ({ ...prev, stairstepPercent: parseInt(setting.value || '35') }));
        }
        if (setting.key === 'ai_leadership_percent') {
          setCommissionSettings(prev => ({ ...prev, leadershipPercent: parseInt(setting.value || '25') }));
        }
        if (setting.key === 'payment_qr_code_url') {
          setQrCodeUrl(setting.value || '');
        }
        if (setting.key === 'payment_bank_account_name') {
          setBankDetails(prev => ({ ...prev, accountName: setting.value || '' }));
        }
        if (setting.key === 'payment_bank_account_number') {
          setBankDetails(prev => ({ ...prev, accountNumber: setting.value || '' }));
        }
        if (setting.key === 'payment_bank_name') {
          setBankDetails(prev => ({ ...prev, bankName: setting.value || '' }));
        }
      });

      setTiers(tierData);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseWithCredits = async () => {
    if (selectedTier === null || !user) return;

    const tier = tiers[selectedTier];

    if (userCredits < tier.price) {
      toast.error(`Insufficient credits. You need ₱${tier.price} worth of credits.`);
      return;
    }

    setPurchasing(true);
    try {
      const affiliatePool = tier.price * (1 - commissionSettings.adminPercent / 100);
      const totalCommissionPercent = commissionSettings.unilevelPercent + commissionSettings.stairstepPercent + commissionSettings.leadershipPercent;
      
      const adminEarnings = tier.price * (commissionSettings.adminPercent / 100);
      const unilevelCommission = affiliatePool * (commissionSettings.unilevelPercent / totalCommissionPercent);
      const stairstepCommission = affiliatePool * (commissionSettings.stairstepPercent / totalCommissionPercent);
      const leadershipCommission = affiliatePool * (commissionSettings.leadershipPercent / totalCommissionPercent);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', user.id)
        .single();

      const newCredits = (userCredits - tier.price) + tier.credits;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await supabase.from('ai_credit_purchases').insert({
        user_id: user.id,
        amount: tier.price,
        credits_received: tier.credits,
        payment_method: 'credits',
        referrer_id: profileData?.referred_by || null,
        admin_earnings: adminEarnings,
        unilevel_commission: unilevelCommission,
        stairstep_commission: stairstepCommission,
        leadership_commission: leadershipCommission,
        status: 'completed'
      });

      if (profileData?.referred_by) {
        await supabase.from('commissions').insert({
          user_id: profileData.referred_by,
          from_user_id: user.id,
          amount: unilevelCommission,
          commission_type: 'ai_credit_unilevel',
          level: 1,
          notes: `AI Credit purchase commission from ${tier.credits} credits`
        });
      }

      toast.success(`Successfully purchased ${tier.credits} AI credits!`);
      onPurchaseComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to complete purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseWithPayMongo = async () => {
    if (selectedTier === null || !user) {
      toast.error('Please select a credit package first');
      return;
    }

    const tier = tiers[selectedTier];

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: tier.price,
          paymentMethod: paymongoMethod,
          description: `AI Credits - ${tier.credits} credits`,
          metadata: {
            user_id: user.id,
            purchase_type: 'ai_credits',
            credits: tier.credits,
            tier_index: selectedTier
          }
        }
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data?.client_key) {
        toast.info("Payment initiated. Please complete the payment in the popup.");
        window.open(`https://pm.link/${data.payment_intent_id}`, '_blank');
      } else {
        throw new Error('No payment URL returned');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to create payment');
      setPurchasing(false);
    }
  };

  const handlePurchaseWithQRCode = async () => {
    if (selectedTier === null || !user) {
      toast.error('Please select a credit package first');
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error('Please enter your payment reference number');
      return;
    }

    const tier = tiers[selectedTier];

    setPurchasing(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', user.id)
        .single();

      // Create pending purchase record for admin approval
      const { error } = await supabase.from('ai_credit_purchases').insert({
        user_id: user.id,
        amount: tier.price,
        credits_received: tier.credits,
        payment_method: 'qrcode',
        referrer_id: profileData?.referred_by || null,
        status: 'pending'
      });

      if (error) throw error;

      setShowQrSuccess(true);
      setReferenceNumber('');
      toast.success('Payment submitted! Awaiting admin approval.');
    } catch (error: any) {
      console.error('QR Payment error:', error);
      toast.error(error.message || 'Failed to submit payment');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchase = () => {
    if (selectedTier === null) {
      toast.error('Please select a credit package first');
      return;
    }
    if (paymentMethod === 'credits') {
      handlePurchaseWithCredits();
    } else if (paymentMethod === 'qrcode') {
      handlePurchaseWithQRCode();
    } else {
      handlePurchaseWithPayMongo();
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getTierConfig = (index: number) => {
    const configs = [
      { label: 'Starter', discount: 40, gradient: 'from-cyan-500 to-blue-600', iconBg: 'bg-cyan-500' },
      { label: 'Popular', discount: 50, gradient: 'from-pink-500 to-purple-600', iconBg: 'bg-pink-500' },
      { label: 'Pro', discount: 60, gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-500' }
    ];
    return configs[index] || configs[0];
  };

  const getOriginalPrice = (price: number, discount: number) => {
    return Math.round(price / (1 - discount / 100));
  };

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0">
        {/* Colorful Header */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 p-6 rounded-t-lg">
          <div className="flex items-center justify-between mb-4">
            <DialogHeader className="text-left">
              <DialogTitle className="flex items-center gap-2 text-white text-xl">
                <Crown className="h-6 w-6 text-yellow-400" />
                AI Credits Store
              </DialogTitle>
              <DialogDescription className="text-purple-200">
                Unlock powerful AI generations
              </DialogDescription>
            </DialogHeader>
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 text-sm px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Limited Offer
            </Badge>
          </div>
          
          {/* Countdown Timer */}
          <div className="flex items-center justify-center gap-2">
            <Timer className="h-4 w-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm mr-2">Offer ends in:</span>
            <div className="flex gap-1">
              {[
                { value: countdown.hours, label: 'H' },
                { value: countdown.minutes, label: 'M' },
                { value: countdown.seconds, label: 'S' }
              ].map((time, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="bg-slate-800 text-white font-mono font-bold px-2 py-1 rounded text-sm">
                    {formatTime(time.value)}
                  </span>
                  {i < 2 && <span className="text-white font-bold">:</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <div className="p-6 space-y-6 bg-gradient-to-b from-background to-muted/30">
            {/* Credit Packages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier, index) => {
                const config = getTierConfig(index);
                const originalPrice = getOriginalPrice(tier.price, config.discount);
                const isSelected = selectedTier === index;
                
                return (
                  <div
                    key={index}
                    onClick={() => setSelectedTier(index)}
                    className={`relative cursor-pointer rounded-xl transition-all duration-300 transform hover:scale-105 ${
                      isSelected 
                        ? 'ring-4 ring-purple-500/50 shadow-2xl shadow-purple-500/20' 
                        : 'hover:shadow-xl'
                    }`}
                  >
                    {/* Discount Badge */}
                    <div className="absolute -top-3 -right-3 z-10">
                      <Badge className={`bg-gradient-to-r ${config.gradient} text-white border-0 text-xs px-3 py-1 shadow-lg`}>
                        {config.discount}% OFF
                      </Badge>
                    </div>
                    
                    {index === 1 && (
                      <div className="absolute -top-3 left-3 z-10">
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs px-3 py-1 shadow-lg">
                          <Star className="h-3 w-3 mr-1" />
                          Best Value
                        </Badge>
                      </div>
                    )}
                    
                    <div className={`p-5 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? `border-transparent bg-gradient-to-br ${config.gradient} text-white` 
                        : 'border-border bg-card hover:border-purple-400/50'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : config.iconBg}`}>
                          <Sparkles className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-white'}`} />
                        </div>
                        <span className="font-bold text-lg">{config.label}</span>
                        {isSelected && <Check className="h-5 w-5 ml-auto" />}
                      </div>
                      
                      <div className="mb-4">
                        <span className={`text-sm line-through ${isSelected ? 'text-white/60' : 'text-muted-foreground'}`}>
                          ₱{originalPrice}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className={`text-3xl font-extrabold ${isSelected ? 'text-white' : `bg-gradient-to-r ${config.gradient} bg-clip-text text-transparent`}`}>
                            ₱{tier.price}
                          </span>
                          <span className={`text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                            /package
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`flex items-center gap-2 text-sm ${isSelected ? 'text-white/90' : ''}`}>
                          <Sparkles className={`h-4 w-4 ${isSelected ? 'text-yellow-300' : 'text-purple-500'}`} />
                          <span className="font-semibold">{tier.credits} AI Credits</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <ImageIcon className="h-4 w-4" />
                          <span>~{tier.images} images</span>
                        </div>
                        <div className={`flex items-center gap-2 text-sm ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                          <VideoIcon className="h-4 w-4" />
                          <span>~{tier.videos} videos</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-500" />
                Select Payment Method
              </h4>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={() => setPaymentMethod('paymongo')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === 'paymongo'
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                      : 'border-border hover:border-purple-400/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${paymentMethod === 'paymongo' ? 'bg-purple-500' : 'bg-muted'}`}>
                    <CreditCard className={`h-5 w-5 ${paymentMethod === 'paymongo' ? 'text-white' : ''}`} />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">Pay Online</div>
                    <div className="text-xs text-muted-foreground">GCash, Maya</div>
                  </div>
                  {paymentMethod === 'paymongo' && <Check className="h-4 w-4 text-purple-500" />}
                </button>
                
                <button
                  onClick={() => setPaymentMethod('qrcode')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === 'qrcode'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-border hover:border-blue-400/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${paymentMethod === 'qrcode' ? 'bg-blue-500' : 'bg-muted'}`}>
                    <QrCode className={`h-5 w-5 ${paymentMethod === 'qrcode' ? 'text-white' : ''}`} />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">QR / Bank</div>
                    <div className="text-xs text-muted-foreground">Direct Transfer</div>
                  </div>
                  {paymentMethod === 'qrcode' && <Check className="h-4 w-4 text-blue-500" />}
                </button>
                
                <button
                  onClick={() => setPaymentMethod('credits')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    paymentMethod === 'credits'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                      : 'border-border hover:border-green-400/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${paymentMethod === 'credits' ? 'bg-green-500' : 'bg-muted'}`}>
                    <Wallet className={`h-5 w-5 ${paymentMethod === 'credits' ? 'text-white' : ''}`} />
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-sm">Balance</div>
                    <div className="text-xs text-muted-foreground">₱{userCredits}</div>
                  </div>
                  {paymentMethod === 'credits' && <Check className="h-4 w-4 text-green-500" />}
                </button>
              </div>

              {paymentMethod === 'paymongo' && (
                <div className="space-y-3">
                  <RadioGroup 
                    value={paymongoMethod} 
                    onValueChange={(v) => setPaymongoMethod(v as any)} 
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    {[
                      { value: 'gcash', label: 'GCash', color: 'text-blue-500', bg: 'bg-blue-500' },
                      { value: 'paymaya', label: 'Maya', color: 'text-green-500', bg: 'bg-green-500' },
                      { value: 'card', label: 'Card', color: 'text-purple-500', bg: 'bg-purple-500' },
                      { value: 'grab_pay', label: 'GrabPay', color: 'text-emerald-500', bg: 'bg-emerald-500' }
                    ].map(method => (
                      <div key={method.value}>
                        <RadioGroupItem value={method.value} id={method.value} className="peer sr-only" />
                        <Label
                          htmlFor={method.value}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 cursor-pointer transition-all hover:scale-105 ${
                            paymongoMethod === method.value 
                              ? `border-transparent ${method.bg} text-white shadow-lg` 
                              : 'border-muted hover:border-purple-400/50'
                          }`}
                        >
                          <Smartphone className="h-5 w-5" />
                          <span className="text-sm font-medium">{method.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* QR Code / Bank Transfer Section */}
              {paymentMethod === 'qrcode' && (
                <div className="space-y-4">
                  {showQrSuccess ? (
                    <div className="p-6 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                      <h4 className="font-bold text-green-700 dark:text-green-300 mb-2">Payment Submitted!</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Your payment is pending admin approval. Credits will be added once verified.
                      </p>
                      <Button
                        onClick={() => setShowQrSuccess(false)}
                        variant="outline"
                        className="mt-4"
                      >
                        Submit Another Payment
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* QR Code Display */}
                      {qrCodeUrl ? (
                        <div className="flex flex-col items-center p-4 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-sm text-muted-foreground mb-3">Scan QR code to pay</p>
                          <img 
                            src={qrCodeUrl} 
                            alt="Payment QR Code" 
                            className="w-48 h-48 object-contain rounded-lg border"
                          />
                          {selectedTier !== null && (
                            <p className="mt-3 text-lg font-bold text-primary">
                              Amount: ₱{tiers[selectedTier].price}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                          <Building2 className="h-12 w-12 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                            No QR code available. Please use bank transfer details below.
                          </p>
                        </div>
                      )}

                      {/* Bank Details - Always show section */}
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-3">
                        <h5 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Bank Transfer Details
                        </h5>
                        
                        {(bankDetails.accountName || bankDetails.accountNumber || bankDetails.bankName) ? (
                          <div className="space-y-3">
                            {bankDetails.bankName && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Bank:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bankDetails.bankName}</span>
                                  <button onClick={() => copyToClipboard(bankDetails.bankName, 'bank')}>
                                    {copiedField === 'bank' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {bankDetails.accountName && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Account Name:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bankDetails.accountName}</span>
                                  <button onClick={() => copyToClipboard(bankDetails.accountName, 'name')}>
                                    {copiedField === 'name' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {bankDetails.accountNumber && (
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Account Number:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium font-mono">{bankDetails.accountNumber}</span>
                                  <button onClick={() => copyToClipboard(bankDetails.accountNumber, 'number')}>
                                    {copiedField === 'number' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Building2 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                              Bank details not yet configured by admin.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Please contact admin for payment details.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Reference Number Input */}
                      <div className="space-y-2">
                        <Label htmlFor="reference" className="text-sm font-medium">
                          Payment Reference Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="reference"
                          placeholder="Enter your payment reference/transaction ID"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter the reference number from your payment confirmation
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {paymentMethod === 'credits' && selectedTier !== null && userCredits < tiers[selectedTier].price && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                    Insufficient balance. You need ₱{tiers[selectedTier].price - userCredits} more.
                  </p>
                </div>
              )}
            </div>

            {/* Buy Now Button - Hide when QR success shown */}
            {!(paymentMethod === 'qrcode' && showQrSuccess) && (
              <Button
                onClick={handlePurchase}
                disabled={
                  purchasing || 
                  selectedTier === null || 
                  (paymentMethod === 'credits' && selectedTier !== null && userCredits < tiers[selectedTier].price) ||
                  (paymentMethod === 'qrcode' && !referenceNumber.trim())
                }
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 hover:from-pink-600 hover:via-purple-600 hover:to-violet-600 text-white border-0 rounded-xl shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02]"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : paymentMethod === 'qrcode' ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Submit Payment {selectedTier !== null && `- ₱${tiers[selectedTier].price}`}
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Buy Now {selectedTier !== null && `- ₱${tiers[selectedTier].price}`}
                  </>
                )}
              </Button>
            )}

            {/* Pay with GCash Quick Option */}
            {paymentMethod === 'paymongo' && paymongoMethod === 'gcash' && (
              <Button
                onClick={handlePurchase}
                disabled={purchasing || selectedTier === null}
                variant="outline"
                className="w-full h-12 font-semibold border-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl"
              >
                <span className="mr-2">Pay with</span>
                <span className="font-bold text-blue-600">GCash</span>
              </Button>
            )}

            {/* Features List */}
            {selectedTier !== null && (
              <div className="p-5 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
                <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-3">What you'll get:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    `${tiers[selectedTier].credits} AI Credits`,
                    `~${tiers[selectedTier].images} Image Generations`,
                    `~${tiers[selectedTier].videos} Video Generations`,
                    'Deep Research Access',
                    'Image to Video',
                    'Text to Video'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affiliate Benefits */}
            <div className="p-4 rounded-xl bg-muted/50 border">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Affiliate Benefits
              </h4>
              <p className="text-xs text-muted-foreground">
                Your referrer earns commission when you purchase! Commissions are distributed across 
                Unilevel ({commissionSettings.unilevelPercent}%), Stair-Step ({commissionSettings.stairstepPercent}%), 
                and Leadership ({commissionSettings.leadershipPercent}%) programs.
              </p>
            </div>

            {/* Upgrade Button */}
            {currentUserTier >= 0 && currentUserTier < tiers.length - 1 && (
              <Button
                onClick={() => setShowUpgradeDialog(true)}
                variant="outline"
                className="w-full border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Upgrade Your Current Tier
              </Button>
            )}
          </div>
        )}

        <TierUpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          currentTierIndex={currentUserTier}
          onUpgradeComplete={() => {
            onPurchaseComplete?.();
            fetchUserTier();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
