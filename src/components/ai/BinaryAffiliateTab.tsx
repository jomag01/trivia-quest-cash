import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAISubscription } from '@/hooks/useAISubscription';
import AISubscriptionDialog from '@/components/ai/AISubscriptionDialog';
import { 
  GitBranch, 
  Users, 
  TrendingUp, 
  Wallet,
  ArrowLeft,
  ArrowRight,
  Crown,
  RefreshCw,
  Clock,
  Loader2,
  Sparkles,
  ImageIcon,
  VideoIcon,
  Music,
  Check,
  CreditCard,
  Smartphone,
  Zap,
  QrCode,
  Copy,
  CheckCircle2,
  Gift,
  Star,
  DollarSign,
  Calendar
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BinaryPosition {
  id: string;
  user_id: string;
  left_volume: number;
  right_volume: number;
  total_cycles: number;
  joined_at: string;
}

interface BinarySettings {
  joinAmount: number;
  cycleVolume: number;
  cycleCommission: number;
  dailyCap: number;
  adminSafetyNet: number;
  autoReplenishEnabled: boolean;
  autoReplenishPercent: number;
}

interface CreditTier {
  price: number;
  cost: number;
  credits: number;
  images: number;
  videos: number;
  maxVideoSeconds: number;
  maxAudioSeconds: number;
  dailyCap: number;
}

interface CreditRates {
  creditsPerVideoMinute: number;
  creditsPerAudioMinute: number;
  creditsPerImage: number;
}

interface SelectedServices {
  images: boolean;
  video: boolean;
  audio: boolean;
}

interface DailyEarning {
  earning_date: string;
  total_earned: number;
  cycles_completed: number;
}

export default function BinaryAffiliateTab({ onBuyCredits }: { onBuyCredits: () => void }) {
  const { user, profile } = useAuth();
  const { subscription, hasActiveSubscription, getCreditsRemaining, getDaysUntilExpiry, refetch: refetchSubscription } = useAISubscription();
  const [binaryPosition, setBinaryPosition] = useState<BinaryPosition | null>(null);
  const [settings, setSettings] = useState<BinarySettings>({
    joinAmount: 500,
    cycleVolume: 1000,
    cycleCommission: 100,
    dailyCap: 5000,
    adminSafetyNet: 35,
    autoReplenishEnabled: true,
    autoReplenishPercent: 20
  });
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    monthlyPrice: 1390,
    yearlyPrice: 11990,
    monthlyCredits: 500,
    yearlyCredits: 6000
  });
  const [tiers, setTiers] = useState<CreditTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [creditRates, setCreditRates] = useState<CreditRates>({
    creditsPerVideoMinute: 20,
    creditsPerAudioMinute: 5,
    creditsPerImage: 1
  });
  const [selectedServices, setSelectedServices] = useState<SelectedServices>({
    images: true,
    video: true,
    audio: true
  });
  const [todayEarnings, setTodayEarnings] = useState<DailyEarning | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [userTierIndex, setUserTierIndex] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'paymongo' | 'qr_bank'>('paymongo');
  const [paymongoMethod, setPaymongoMethod] = useState<'gcash' | 'paymaya' | 'card' | 'grab_pay'>('gcash');
  const [activeTab, setActiveTab] = useState<'subscription' | 'credits'>('subscription');
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  
  // QR/Bank payment states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<{
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
  }>({ bankName: null, accountName: null, accountNumber: null });
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showQrSuccess, setShowQrSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showEnrollmentDialog, setShowEnrollmentDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Show enrollment encouragement dialog for non-enrolled users after a delay
  useEffect(() => {
    if (!loading && !isEnrolled && user) {
      const timer = setTimeout(() => {
        setShowEnrollmentDialog(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, isEnrolled, user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch binary settings, AI tiers, and payment settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .or('key.like.binary_%,key.like.ai_%,key.like.payment_%');

      const rates: CreditRates = { creditsPerVideoMinute: 20, creditsPerAudioMinute: 5, creditsPerImage: 1 };

      const tierData: CreditTier[] = [
        { price: 100, cost: 30, credits: 50, images: 30, videos: 10, maxVideoSeconds: 10, maxAudioSeconds: 60, dailyCap: 1500 },
        { price: 250, cost: 75, credits: 150, images: 100, videos: 30, maxVideoSeconds: 60, maxAudioSeconds: 300, dailyCap: 3000 },
        { price: 500, cost: 150, credits: 400, images: 300, videos: 80, maxVideoSeconds: 900, maxAudioSeconds: 1800, dailyCap: 9000 }
      ];

      if (settingsData) {
        const newSettings = { ...settings };
        const newSubSettings = { ...subscriptionSettings };
        let qrUrl: string | null = null;
        let bankName: string | null = null;
        let accountName: string | null = null;
        let accountNumber: string | null = null;
        
        settingsData.forEach(s => {
          if (s.key === 'binary_join_amount') newSettings.joinAmount = parseFloat(s.value || '500');
          if (s.key === 'binary_cycle_volume') newSettings.cycleVolume = parseFloat(s.value || '1000');
          if (s.key === 'binary_cycle_commission') newSettings.cycleCommission = parseFloat(s.value || '100');
          if (s.key === 'binary_daily_cap') newSettings.dailyCap = parseFloat(s.value || '5000');
          if (s.key === 'binary_admin_safety_net') newSettings.adminSafetyNet = parseFloat(s.value || '35');
          if (s.key === 'binary_auto_replenish_enabled') newSettings.autoReplenishEnabled = s.value === 'true';
          if (s.key === 'binary_auto_replenish_percent') newSettings.autoReplenishPercent = parseFloat(s.value || '20');

          // Subscription settings
          if (s.key === 'ai_subscription_monthly_price') newSubSettings.monthlyPrice = parseInt(s.value || '1390');
          if (s.key === 'ai_subscription_yearly_price') newSubSettings.yearlyPrice = parseInt(s.value || '11990');
          if (s.key === 'ai_subscription_monthly_credits') newSubSettings.monthlyCredits = parseInt(s.value || '500');
          if (s.key === 'ai_subscription_yearly_credits') newSubSettings.yearlyCredits = parseInt(s.value || '6000');

          // Credit rates
          if (s.key === 'ai_credits_per_video_minute') rates.creditsPerVideoMinute = parseFloat(s.value || '20');
          if (s.key === 'ai_credits_per_audio_minute') rates.creditsPerAudioMinute = parseFloat(s.value || '5');
          if (s.key === 'ai_credits_per_image') rates.creditsPerImage = parseFloat(s.value || '1');

          // QR/Bank payment settings
          if (s.key === 'payment_qr_code_url') qrUrl = s.value;
          if (s.key === 'payment_bank_name') bankName = s.value;
          if (s.key === 'payment_bank_account_name') accountName = s.value;
          if (s.key === 'payment_bank_account_number') accountNumber = s.value;

          // Parse tier data
          const match = s.key.match(/ai_credit_tier_(\d)_(\w+)/);
          if (match) {
            const tierIndex = parseInt(match[1]) - 1;
            const field = match[2];
            if (tierIndex >= 0 && tierIndex < 3) {
              if (field === 'price') tierData[tierIndex].price = parseFloat(s.value || '0');
              if (field === 'cost') tierData[tierIndex].cost = parseFloat(s.value || '0');
              if (field === 'credits') tierData[tierIndex].credits = parseInt(s.value || '0');
              if (field === 'image') tierData[tierIndex].images = parseInt(s.value || '0');
              if (field === 'video') tierData[tierIndex].videos = parseInt(s.value || '0');
              if (field === 'videoseconds') tierData[tierIndex].maxVideoSeconds = parseInt(s.value || '0');
              if (field === 'audioseconds') tierData[tierIndex].maxAudioSeconds = parseInt(s.value || '0');
              if (field === 'daily_cap') tierData[tierIndex].dailyCap = parseFloat(s.value || '5000');
            }
          }
        });
        setSettings(newSettings);
        setSubscriptionSettings(newSubSettings);
        setTiers(tierData);
        setCreditRates(rates);
        setQrCodeUrl(qrUrl);
        setBankDetails({ bankName, accountName, accountNumber });
      }

      // Fetch user's latest approved purchase to determine their tier
      const { data: purchaseData } = await supabase
        .from('binary_ai_purchases')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (purchaseData) {
        const purchaseAmount = Number(purchaseData.amount);
        // Determine tier based on purchase amount
        if (purchaseAmount >= 10000) {
          setUserTierIndex(2); // Tier 3
        } else if (purchaseAmount >= 5000) {
          setUserTierIndex(1); // Tier 2
        } else {
          setUserTierIndex(0); // Tier 1
        }
      }

      // Check if user is enrolled in binary system
      const { data: positionData } = await supabase
        .from('binary_network')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (positionData) {
        setBinaryPosition(positionData as BinaryPosition);
        setIsEnrolled(true);
      } else {
        setIsEnrolled(false);
      }

      // Fetch today's earnings
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyData } = await supabase
        .from('binary_daily_earnings')
        .select('*')
        .eq('user_id', user.id)
        .eq('earning_date', today)
        .maybeSingle();

      if (dailyData) {
        setTodayEarnings(dailyData as DailyEarning);
      }

      // Fetch total earnings
      const { data: commissionData } = await supabase
        .from('binary_commissions')
        .select('amount')
        .eq('user_id', user.id);

      if (commissionData) {
        const total = commissionData.reduce((sum, c) => sum + Number(c.amount), 0);
        setTotalEarnings(total);
      }

      // Fetch user credits
      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();

      setUserCredits(profileData?.credits || 0);

    } catch (error) {
      console.error('Error fetching binary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCycleProgress = () => {
    if (!binaryPosition) return { leftPercent: 0, rightPercent: 0, potentialCycles: 0 };
    
    const leftVolume = binaryPosition.left_volume || 0;
    const rightVolume = binaryPosition.right_volume || 0;
    const cycleVolume = settings.cycleVolume;

    const leftPercent = Math.min((leftVolume / cycleVolume) * 100, 100);
    const rightPercent = Math.min((rightVolume / cycleVolume) * 100, 100);
    const potentialCycles = Math.floor(Math.min(leftVolume, rightVolume) / cycleVolume);

    return { leftPercent, rightPercent, potentialCycles };
  };

  const getUserDailyCap = () => {
    // Use tier-specific daily cap if user has a tier, otherwise use global setting
    if (userTierIndex !== null && tiers[userTierIndex]) {
      return tiers[userTierIndex].dailyCap;
    }
    return settings.dailyCap;
  };

  const getDailyCapProgress = () => {
    if (!todayEarnings) return 0;
    const dailyCap = getUserDailyCap();
    return dailyCap > 0 ? Math.min((todayEarnings.total_earned / dailyCap) * 100, 100) : 0;
  };

  // Helper function to format seconds as mm:ss
  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m`;
    return `${secs}s`;
  };

  // Calculate what the user gets based on service selection
  const calculateServiceAllocation = () => {
    if (selectedTier === null) return { images: 0, videoSeconds: 0, audioSeconds: 0, bonusCredits: 0 };
    const tier = tiers[selectedTier];
    
    let images = selectedServices.images ? tier.images : 0;
    let videoSeconds = selectedServices.video ? tier.maxVideoSeconds : 0;
    let audioSeconds = selectedServices.audio ? tier.maxAudioSeconds : 0;
    
    // Calculate bonus credits from unused services
    let bonusCredits = 0;
    if (!selectedServices.images) {
      bonusCredits += tier.images * creditRates.creditsPerImage;
    }
    if (!selectedServices.video) {
      bonusCredits += (tier.maxVideoSeconds / 60) * creditRates.creditsPerVideoMinute;
    }
    if (!selectedServices.audio) {
      bonusCredits += (tier.maxAudioSeconds / 60) * creditRates.creditsPerAudioMinute;
    }
    
    return { images, videoSeconds, audioSeconds, bonusCredits };
  };

  const handlePurchaseCredits = async () => {
    if (selectedTier === null || !user) return;
    const tier = tiers[selectedTier];
    const allocation = calculateServiceAllocation();

    // At least one service must be selected
    if (!selectedServices.images && !selectedServices.video && !selectedServices.audio) {
      toast.error('Please select at least one AI service');
      return;
    }

    if (userCredits < tier.price) {
      toast.error(`Insufficient credits. You need ₱${tier.price}`);
      return;
    }

    setPurchasing(true);
    try {
      // Deduct credits
      await supabase.from('profiles').update({ credits: userCredits - tier.price }).eq('id', user.id);

      // Get referrer
      const { data: profileData } = await supabase.from('profiles').select('referred_by').eq('id', user.id).single();

      // Create pending purchase for admin approval with selected services
      await supabase.from('binary_ai_purchases').insert({
        user_id: user.id,
        amount: tier.price,
        credits_received: tier.credits + Math.floor(allocation.bonusCredits),
        images_allocated: allocation.images,
        video_minutes_allocated: allocation.videoSeconds / 60,
        audio_minutes_allocated: allocation.audioSeconds / 60,
        sponsor_id: profileData?.referred_by || null,
        status: 'pending',
        is_first_purchase: !isEnrolled
      });

      toast.success('Purchase submitted for admin approval! Credits will be added once approved.');
      fetchData();
      setSelectedTier(null);
      setSelectedServices({ images: true, video: true, audio: true });
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to submit purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePurchaseWithPayMongo = async () => {
    if (selectedTier === null || !user) {
      toast.error('Please select a credit package first');
      return;
    }

    if (!selectedServices.images && !selectedServices.video && !selectedServices.audio) {
      toast.error('Please select at least one AI service');
      return;
    }

    const tier = tiers[selectedTier];
    const allocation = calculateServiceAllocation();

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: tier.price,
          paymentMethod: paymongoMethod,
          description: `AI Credits - ${tier.credits + Math.floor(allocation.bonusCredits)} credits`,
          metadata: {
            user_id: user.id,
            purchase_type: 'binary_ai_credits',
            credits: tier.credits + Math.floor(allocation.bonusCredits),
            tier_index: selectedTier,
            images_allocated: allocation.images,
            video_seconds: allocation.videoSeconds,
            audio_seconds: allocation.audioSeconds
          }
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Payment service unavailable');
      }

      // Check if the response contains an error (edge function returned 400)
      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No payment URL returned. Please try again.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.message || 'Failed to create payment';
      
      // Show more helpful message for account activation error
      if (errorMessage.includes('activated')) {
        toast.error('Payment provider not ready. Please contact admin to activate PayMongo account.', {
          duration: 5000
        });
      } else {
        toast.error(errorMessage);
      }
      setPurchasing(false);
    }
  };

  const handlePurchaseWithQRCode = async () => {
    if (selectedTier === null || !user) {
      toast.error('Please select a credit package first');
      return;
    }

    if (!selectedServices.images && !selectedServices.video && !selectedServices.audio) {
      toast.error('Please select at least one AI service');
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error('Please enter your payment reference number');
      return;
    }

    const tier = tiers[selectedTier];
    const allocation = calculateServiceAllocation();

    setPurchasing(true);
    try {
      // Get referrer
      const { data: profileData } = await supabase.from('profiles').select('referred_by').eq('id', user.id).single();

      // Create pending purchase for admin approval
      const { error } = await supabase.from('binary_ai_purchases').insert({
        user_id: user.id,
        amount: tier.price,
        credits_received: tier.credits + Math.floor(allocation.bonusCredits),
        images_allocated: allocation.images,
        video_minutes_allocated: allocation.videoSeconds / 60,
        audio_minutes_allocated: allocation.audioSeconds / 60,
        sponsor_id: profileData?.referred_by || null,
        status: 'pending',
        is_first_purchase: !isEnrolled,
        admin_notes: `QR/Bank Payment - Ref: ${referenceNumber.trim()}`
      });

      if (error) throw error;

      setShowQrSuccess(true);
      setReferenceNumber('');
      toast.success('Payment submitted! Your credits will be added once admin verifies the payment.');
      fetchData();
      setSelectedTier(null);
      setSelectedServices({ images: true, video: true, audio: true });
    } catch (error: any) {
      console.error('QR Payment error:', error);
      toast.error(error.message || 'Failed to submit payment');
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

  const handlePurchase = () => {
    if (paymentMethod === 'balance') {
      handlePurchaseCredits();
    } else if (paymentMethod === 'qr_bank') {
      handlePurchaseWithQRCode();
    } else {
      handlePurchaseWithPayMongo();
    }
  };

  const getTierLabel = (index: number) => ['Starter', 'Popular', 'Pro'][index] || `Tier ${index + 1}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { leftPercent, rightPercent, potentialCycles } = calculateCycleProgress();

  return (
    <>
      {/* Enrollment Encouragement Dialog */}
      <Dialog open={showEnrollmentDialog} onOpenChange={setShowEnrollmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Gift className="h-6 w-6 text-amber-500" />
              Start Earning Passive Income!
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Join our affiliate network and unlock amazing earning potential!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
              <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Earn ₱{Math.round((settings.cycleVolume * 2 * 0.10)).toLocaleString()} per cycle</p>
                <p className="text-xs text-muted-foreground">When both legs match volume</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
              <Star className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Up to ₱{settings.dailyCap.toLocaleString()} per account</p>
                <p className="text-xs text-muted-foreground">Create up to 3 accounts to maximize earnings</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800">
              <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">AI-Powered Features</p>
                <p className="text-xs text-muted-foreground">Generate images, videos, and audio with AI</p>
              </div>
            </div>
          </div>
          {/* Income Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">SEC Disclaimer:</span> This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => setShowEnrollmentDialog(false)} 
              className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Zap className="h-4 w-4" />
              Choose a Package Now
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setShowEnrollmentDialog(false)}
              className="text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subscription Dialog */}
      <AISubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
        onPurchaseComplete={() => {
          fetchData();
          refetchSubscription();
        }}
      />

      <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
            AI Hub Subscription
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Subscribe to unlock all AI features and earn passive income through our affiliate network
          </p>
        </div>

        {/* Current Subscription Status */}
        {hasActiveSubscription && (
          <Card className="border-primary/20 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                    <Crown className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{subscription?.plan_type} Plan Active</p>
                    <p className="text-sm text-muted-foreground">
                      {getCreditsRemaining()} credits • {getDaysUntilExpiry()} days remaining
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubscriptionDialog(true)}
                >
                  Top-up
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Plans */}
        {!hasActiveSubscription && (
          <Card className="border-primary/20">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-lg">Choose Your Subscription</CardTitle>
              <CardDescription className="text-xs">
                Subscribe to unlock AI features and join the affiliate network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Monthly Plan */}
                <Card 
                  className="cursor-pointer border-2 hover:border-primary/50 transition-all"
                  onClick={() => setShowSubscriptionDialog(true)}
                >
                  <CardContent className="p-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="font-semibold">Monthly</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">₱{subscriptionSettings.monthlyPrice.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">/month</p>
                    </div>
                    <Badge variant="secondary">{subscriptionSettings.monthlyCredits.toLocaleString()} credits</Badge>
                    <p className="text-xs text-muted-foreground">Perfect for getting started</p>
                  </CardContent>
                </Card>

                {/* Yearly Plan */}
                <Card 
                  className="cursor-pointer border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 hover:border-yellow-500 transition-all relative"
                  onClick={() => setShowSubscriptionDialog(true)}
                >
                  <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                    Best Value
                  </Badge>
                  <CardContent className="p-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span className="font-semibold">Yearly</span>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">₱{subscriptionSettings.yearlyPrice.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">/year</p>
                    </div>
                    <Badge variant="default">{subscriptionSettings.yearlyCredits.toLocaleString()} credits</Badge>
                    <p className="text-xs text-muted-foreground">All features unlocked</p>
                  </CardContent>
                </Card>
              </div>

              <Button 
                className="w-full gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
                onClick={() => setShowSubscriptionDialog(true)}
              >
                <Zap className="h-4 w-4" />
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Benefits Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Subscription Benefits
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">All AI Features</p>
                  <p className="text-xs text-muted-foreground">Image, video, audio generation</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60">
                <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/50">
                  <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Binary Network</p>
                  <p className="text-xs text-muted-foreground">Build your team</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Earn Commissions</p>
                  <p className="text-xs text-muted-foreground">From referrals</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-background/60">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Monthly Credits</p>
                  <p className="text-xs text-muted-foreground">Added on renewal</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Legacy Credit Packages (Collapsible) */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                One-time Credit Packages
              </CardTitle>
              <Badge variant="outline">Legacy</Badge>
            </div>
            <CardDescription className="text-xs">
              Or purchase credits without a subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tier Selection */}
            <div className="grid grid-cols-1 gap-3">
              {tiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all p-4 hover:shadow-md ${
                    selectedTier === index 
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTier(index)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={index === 1 ? "default" : "secondary"} className="text-xs">
                          {getTierLabel(index)}
                        </Badge>
                        <span className="font-bold text-lg">₱{tier.price.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-purple-500" /> {tier.images} images
                        </span>
                        <span className="flex items-center gap-1">
                          <VideoIcon className="h-3 w-3 text-pink-500" /> {formatSeconds(tier.maxVideoSeconds)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Music className="h-3 w-3 text-blue-500" /> {formatSeconds(tier.maxAudioSeconds)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Daily cap: ₱{tier.dailyCap.toLocaleString()}
                      </p>
                    </div>
                    {selectedTier === index && (
                      <div className="p-2 rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Service Selection */}
            {selectedTier !== null && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
                <p className="font-medium text-sm">Select AI Services You Want:</p>
                <p className="text-xs text-muted-foreground">
                  Unselected services convert to bonus credits.
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background/50">
                    <input 
                      type="checkbox" 
                      checked={selectedServices.images}
                      onChange={(e) => setSelectedServices(prev => ({ ...prev, images: e.target.checked }))}
                      className="rounded"
                    />
                    <ImageIcon className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Image Generation ({tiers[selectedTier].images} images)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background/50">
                    <input 
                      type="checkbox" 
                      checked={selectedServices.video}
                      onChange={(e) => setSelectedServices(prev => ({ ...prev, video: e.target.checked }))}
                      className="rounded"
                    />
                    <VideoIcon className="h-4 w-4 text-pink-500" />
                    <span className="text-sm">Video Generation ({formatSeconds(tiers[selectedTier].maxVideoSeconds)})</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background/50">
                    <input 
                      type="checkbox" 
                      checked={selectedServices.audio}
                      onChange={(e) => setSelectedServices(prev => ({ ...prev, audio: e.target.checked }))}
                      className="rounded"
                    />
                    <Music className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Audio Generation ({formatSeconds(tiers[selectedTier].maxAudioSeconds)})</span>
                  </label>
                </div>

                {/* Allocation Summary */}
                {(() => {
                  const allocation = calculateServiceAllocation();
                  return (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                      <p className="font-medium text-primary mb-1">Your Allocation:</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p>• Base Credits: {tiers[selectedTier].credits}</p>
                        {allocation.bonusCredits > 0 && (
                          <p className="text-green-600">• Bonus Credits: +{Math.floor(allocation.bonusCredits)}</p>
                        )}
                        <p className="font-semibold text-foreground">
                          Total: {tiers[selectedTier].credits + Math.floor(allocation.bonusCredits)} credits
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Payment Method Selection */}
            {selectedTier !== null && (
              <div className="space-y-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border">
                <p className="font-medium text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  Payment Method
                </p>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('paymongo')}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 text-sm ${
                      paymentMethod === 'paymongo'
                        ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/50'
                        : 'border-border hover:border-purple-400/50'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <div className="text-center">
                      <div className="font-medium text-xs">Pay Online</div>
                      <div className="text-xs text-muted-foreground">GCash, Maya</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('qr_bank')}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 text-sm ${
                      paymentMethod === 'qr_bank'
                        ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/50'
                        : 'border-border hover:border-amber-400/50'
                    }`}
                  >
                    <QrCode className="h-4 w-4" />
                    <div className="text-center">
                      <div className="font-medium text-xs">QR / Bank</div>
                      <div className="text-xs text-muted-foreground">Manual</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('balance')}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 text-sm ${
                      paymentMethod === 'balance'
                        ? 'border-green-500 bg-green-100 dark:bg-green-900/50'
                        : 'border-border hover:border-green-400/50'
                    }`}
                  >
                    <Wallet className="h-4 w-4" />
                    <div className="text-center">
                      <div className="font-medium text-xs">Balance</div>
                      <div className="text-xs text-muted-foreground">₱{userCredits}</div>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'paymongo' && (
                  <RadioGroup 
                    value={paymongoMethod} 
                    onValueChange={(v) => setPaymongoMethod(v as any)} 
                    className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                  >
                    {[
                      { value: 'gcash', label: 'GCash', color: 'bg-blue-500' },
                      { value: 'paymaya', label: 'Maya', color: 'bg-green-500' },
                      { value: 'card', label: 'Card', color: 'bg-purple-500' },
                      { value: 'grab_pay', label: 'GrabPay', color: 'bg-emerald-500' }
                    ].map(method => (
                      <div key={method.value}>
                        <RadioGroupItem value={method.value} id={`binary-${method.value}`} className="peer sr-only" />
                        <Label
                          htmlFor={`binary-${method.value}`}
                          className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 cursor-pointer transition-all text-xs ${
                            paymongoMethod === method.value 
                              ? `border-transparent ${method.color} text-white` 
                              : 'border-muted hover:border-purple-400/50'
                          }`}
                        >
                          <Smartphone className="h-4 w-4" />
                          <span className="font-medium">{method.label}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {paymentMethod === 'qr_bank' && (
                  <div className="space-y-3">
                    {showQrSuccess ? (
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <p className="font-medium text-green-700 dark:text-green-300">Payment Submitted!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your credits will be added once admin verifies the payment.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => setShowQrSuccess(false)}
                        >
                          Make Another Purchase
                        </Button>
                      </div>
                    ) : (
                      <>
                        {qrCodeUrl && (
                          <div className="flex justify-center">
                            <img src={qrCodeUrl} alt="Payment QR Code" className="w-40 h-40 rounded-lg border" />
                          </div>
                        )}
                        
                        {(bankDetails.bankName || bankDetails.accountNumber) && (
                          <div className="space-y-2 p-3 rounded-lg bg-background border">
                            <p className="font-medium text-sm">Bank Transfer Details:</p>
                            {bankDetails.bankName && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Bank:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bankDetails.bankName}</span>
                                  <button onClick={() => copyToClipboard(bankDetails.bankName!, 'bank')}>
                                    {copiedField === 'bank' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {bankDetails.accountName && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Name:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bankDetails.accountName}</span>
                                  <button onClick={() => copyToClipboard(bankDetails.accountName!, 'name')}>
                                    {copiedField === 'name' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                            {bankDetails.accountNumber && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Account:</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bankDetails.accountNumber}</span>
                                  <button onClick={() => copyToClipboard(bankDetails.accountNumber!, 'account')}>
                                    {copiedField === 'account' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm">Reference Number:</Label>
                          <Input
                            placeholder="Enter your payment reference number"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Amount to pay: ₱{tiers[selectedTier]?.price.toLocaleString()}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {paymentMethod === 'balance' && userCredits < (tiers[selectedTier]?.price || 0) && (
                  <p className="text-xs text-destructive text-center">
                    Insufficient balance. You need ₱{((tiers[selectedTier]?.price || 0) - userCredits).toLocaleString()} more.
                  </p>
                )}
              </div>
            )}

            {/* Purchase Button */}
            <Button 
              onClick={handlePurchase} 
              className="w-full gap-2 h-12 text-base font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-violet-500 hover:from-pink-600 hover:via-purple-600 hover:to-violet-600 text-white border-0 shadow-lg" 
              size="lg"
              disabled={
                selectedTier === null || 
                purchasing || 
                showQrSuccess ||
                (!selectedServices.images && !selectedServices.video && !selectedServices.audio) ||
                (paymentMethod === 'balance' && selectedTier !== null && userCredits < tiers[selectedTier]?.price) ||
                (paymentMethod === 'qr_bank' && !referenceNumber.trim())
              }
            >
              {purchasing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
              {paymentMethod === 'qr_bank' && selectedTier !== null
                ? `Submit Payment (₱${tiers[selectedTier]?.price.toLocaleString()})`
                : selectedTier !== null 
                  ? `Buy Credits (₱${tiers[selectedTier]?.price.toLocaleString()})` 
                  : 'Select a Package'}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              {paymentMethod === 'paymongo' 
                ? `Pay securely with ${paymongoMethod === 'gcash' ? 'GCash' : paymongoMethod === 'paymaya' ? 'Maya' : paymongoMethod === 'card' ? 'Card' : 'GrabPay'}` 
                : paymentMethod === 'qr_bank'
                  ? 'Admin will verify your payment and add credits'
                  : `Your balance: ₱${userCredits.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>

        {/* Affiliate Info */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                <GitBranch className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">Join Our Affiliate Network</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Earn ₱{Math.round((settings.cycleVolume * 2 * 0.10)).toLocaleString()} for every matched cycle</li>
                  <li>• Max earning up to ₱{settings.dailyCap.toLocaleString()} per account</li>
                  <li>• Create up to 3 affiliate accounts</li>
                  <li>• Get placed automatically in the network</li>
                  <li>• Track your earnings in the Dashboard</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
    </>
  );
}