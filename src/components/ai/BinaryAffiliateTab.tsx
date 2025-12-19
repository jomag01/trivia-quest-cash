import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  CheckCircle2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'paymongo' | 'qr_bank'>('paymongo');
  const [paymongoMethod, setPaymongoMethod] = useState<'gcash' | 'paymaya' | 'card' | 'grab_pay'>('gcash');
  
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

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

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
        { price: 100, cost: 30, credits: 50, images: 30, videos: 10, maxVideoSeconds: 10, maxAudioSeconds: 60 },
        { price: 250, cost: 75, credits: 150, images: 100, videos: 30, maxVideoSeconds: 60, maxAudioSeconds: 300 },
        { price: 500, cost: 150, credits: 400, images: 300, videos: 80, maxVideoSeconds: 900, maxAudioSeconds: 1800 }
      ];

      if (settingsData) {
        const newSettings = { ...settings };
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
            }
          }
        });
        setSettings(newSettings);
        setTiers(tierData);
        setCreditRates(rates);
        setQrCodeUrl(qrUrl);
        setBankDetails({ bankName, accountName, accountNumber });
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

  const getDailyCapProgress = () => {
    if (!todayEarnings) return 0;
    return Math.min((todayEarnings.total_earned / settings.dailyCap) * 100, 100);
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
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">AI Affiliate System</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Earn commissions through our cycle-based affiliate network
          </p>
          <Badge variant="outline" className="text-xs">
            Exclusive to AI Credits Purchases
          </Badge>
        </div>

        {/* System Info Banner */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <GitBranch className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  AI Affiliate System - AI Credits Only
                </p>
                <p className="text-muted-foreground text-xs">
                  This affiliate system is <span className="font-semibold">separate</span> from unilevel, stair-step, and leadership commissions. 
                  AI affiliate commissions are earned <span className="font-semibold">only from AI credit purchases</span>, not from shop product purchases. 
                  Shop products earn through unilevel/stair-step/leadership systems instead.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isEnrolled ? (
          /* Not Enrolled View */
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Activate Your AI Affiliate Position
              </CardTitle>
              <CardDescription>
                Your referral has enrolled you in all systems. Purchase AI credits to <span className="font-semibold">activate</span> your affiliate position and start earning!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-background/50 border">
                  <p className="text-2xl font-bold text-primary">₱{settings.joinAmount}</p>
                  <p className="text-xs text-muted-foreground">Minimum to Activate</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border">
                  <p className="text-2xl font-bold text-primary">₱{settings.cycleCommission}</p>
                  <p className="text-xs text-muted-foreground">Per Cycle</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">How the AI Affiliate System works:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Buy AI credits worth ₱{settings.joinAmount}+ to activate</li>
                  <li>Get placed automatically in the weakest leg</li>
                  <li>Earn ₱{settings.cycleCommission} for every ₱{settings.cycleVolume} matched cycle</li>
                  <li>Daily earning cap: ₱{settings.dailyCap}</li>
                  <li>AI affiliate earnings come <span className="font-semibold">only from AI credit purchases</span> in your network</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-muted-foreground">
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">💡 Separate Commission Systems:</p>
                <p>• <span className="font-medium">AI Affiliate:</span> AI Credit purchases only</p>
                <p>• <span className="font-medium">Unilevel/Stair-Step/Leadership:</span> Shop product purchases only</p>
              </div>

              {/* Tier Selection */}
              <div className="space-y-3">
                <p className="font-medium text-sm">Select a Credit Package:</p>
                <div className="grid grid-cols-1 gap-3">
                  {tiers.map((tier, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all p-3 ${selectedTier === index ? 'border-primary ring-2 ring-primary/20' : ''}`}
                      onClick={() => setSelectedTier(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{getTierLabel(index)} - ₱{tier.price}</div>
                          <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                            <span><ImageIcon className="h-3 w-3 inline" /> {tier.images}</span>
                            <span><VideoIcon className="h-3 w-3 inline" /> {formatSeconds(tier.maxVideoSeconds)}</span>
                            <span><Music className="h-3 w-3 inline" /> {formatSeconds(tier.maxAudioSeconds)}</span>
                          </div>
                        </div>
                        {selectedTier === index && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Service Selection */}
              {selectedTier !== null && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                  <p className="font-medium text-sm">Select AI Services You Want:</p>
                  <p className="text-xs text-muted-foreground">
                    Unselected services will be converted to bonus credits for your account.
                  </p>
                  
                  {/* Credit Rates Info */}
                  <div className="text-xs text-muted-foreground p-2 bg-background rounded border">
                    <p className="font-medium mb-1">Credit Rates (set by admin):</p>
                    <div className="flex gap-3">
                      <span>1 image = {creditRates.creditsPerImage} cr</span>
                      <span>1 min video = {creditRates.creditsPerVideoMinute} cr</span>
                      <span>1 min audio = {creditRates.creditsPerAudioMinute} cr</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background/50">
                      <input 
                        type="checkbox" 
                        checked={selectedServices.images}
                        onChange={(e) => setSelectedServices(prev => ({ ...prev, images: e.target.checked }))}
                        className="rounded"
                      />
                      <ImageIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Image Generation ({tiers[selectedTier].images} images)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-background/50">
                      <input 
                        type="checkbox" 
                        checked={selectedServices.video}
                        onChange={(e) => setSelectedServices(prev => ({ ...prev, video: e.target.checked }))}
                        className="rounded"
                      />
                      <VideoIcon className="h-4 w-4 text-purple-500" />
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
                      <div className="p-2 rounded bg-primary/10 border border-primary/20 text-xs">
                        <p className="font-medium text-primary mb-1">Your Allocation:</p>
                        <div className="space-y-1 text-muted-foreground">
                          <p>• Base Credits: {tiers[selectedTier].credits}</p>
                          {allocation.bonusCredits > 0 && (
                            <p className="text-green-600">• Bonus Credits (from unused services): +{Math.floor(allocation.bonusCredits)}</p>
                          )}
                          <p className="font-semibold text-foreground">
                            Total Credits: {tiers[selectedTier].credits + Math.floor(allocation.bonusCredits)}
                          </p>
                          {allocation.images > 0 && <p>• Images: {allocation.images}</p>}
                          {allocation.videoSeconds > 0 && <p>• Video: {formatSeconds(allocation.videoSeconds)}</p>}
                          {allocation.audioSeconds > 0 && <p>• Audio: {formatSeconds(allocation.audioSeconds)}</p>}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Payment Method Selection */}
              {selectedTier !== null && (
                <div className="space-y-3 p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border">
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
                      {paymentMethod === 'paymongo' && <Check className="h-4 w-4 text-purple-500" />}
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
                      {paymentMethod === 'qr_bank' && <Check className="h-4 w-4 text-amber-500" />}
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
                      {paymentMethod === 'balance' && <Check className="h-4 w-4 text-green-500" />}
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
                              <img 
                                src={qrCodeUrl} 
                                alt="Payment QR Code" 
                                className="w-40 h-40 object-contain rounded-lg border"
                              />
                            </div>
                          )}
                          
                          {(bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber) && (
                            <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                              <p className="font-medium text-xs">Bank Transfer Details:</p>
                              {bankDetails.bankName && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Bank:</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{bankDetails.bankName}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(bankDetails.bankName!, 'bank')}
                                    >
                                      {copiedField === 'bank' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {bankDetails.accountName && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Account Name:</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{bankDetails.accountName}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(bankDetails.accountName!, 'name')}
                                    >
                                      {copiedField === 'name' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                  </div>
                                </div>
                              )}
                              {bankDetails.accountNumber && (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Account Number:</span>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{bankDetails.accountNumber}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(bankDetails.accountNumber!, 'number')}
                                    >
                                      {copiedField === 'number' ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {!qrCodeUrl && !bankDetails.bankName && !bankDetails.accountName && (
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-center">
                              <p className="text-amber-600 dark:text-amber-400">
                                QR/Bank payment not configured yet. Please contact admin.
                              </p>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <Label className="text-xs">Reference Number *</Label>
                            <Input
                              placeholder="Enter your payment reference number"
                              value={referenceNumber}
                              onChange={(e) => setReferenceNumber(e.target.value)}
                              className="text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the reference number from your payment confirmation
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'balance' && userCredits < tiers[selectedTier].price && (
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs">
                      <p className="text-red-600 dark:text-red-400 font-medium">
                        Insufficient balance. You need ₱{tiers[selectedTier].price - userCredits} more.
                      </p>
                    </div>
                  )}
                </div>
              )}

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
                  ? `Submit Payment (₱${tiers[selectedTier]?.price})`
                  : selectedTier !== null 
                    ? `Buy ${tiers[selectedTier]?.credits + Math.floor(calculateServiceAllocation().bonusCredits)} Credits (₱${tiers[selectedTier]?.price})` 
                    : 'Select a Package'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {paymentMethod === 'paymongo' 
                  ? `Pay securely with ${paymongoMethod === 'gcash' ? 'GCash' : paymongoMethod === 'paymaya' ? 'Maya' : paymongoMethod === 'card' ? 'Credit/Debit Card' : 'GrabPay'}` 
                  : paymentMethod === 'qr_bank'
                    ? 'Admin will verify your payment and add credits'
                    : `Your balance: ₱${userCredits}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Enrolled View */
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Wallet className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-xl font-bold">₱{totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-2" />
                  <p className="text-xl font-bold">{binaryPosition?.total_cycles || 0}</p>
                  <p className="text-xs text-muted-foreground">Cycles Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-amber-500 mb-2" />
                  <p className="text-xl font-bold">₱{todayEarnings?.total_earned || 0}</p>
                  <p className="text-xs text-muted-foreground">Today's Earnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <RefreshCw className="h-5 w-5 mx-auto text-blue-500 mb-2" />
                  <p className="text-xl font-bold">{potentialCycles}</p>
                  <p className="text-xs text-muted-foreground">Pending Cycles</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Cap Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Daily Earning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>₱{todayEarnings?.total_earned || 0}</span>
                    <span className="text-muted-foreground">/ ₱{settings.dailyCap} cap</span>
                  </div>
                  <Progress value={getDailyCapProgress()} className="h-2" />
                  {getDailyCapProgress() >= 100 && (
                    <p className="text-xs text-amber-500">Daily cap reached! Earnings continue tomorrow.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Affiliate Tree Visualization */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Your Affiliate Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Leg */}
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4 text-primary" />
                      <span className="font-medium">Left Leg</span>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">₱{binaryPosition?.left_volume?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Volume</p>
                    </div>
                    <Progress value={leftPercent} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {leftPercent.toFixed(1)}% to next cycle
                    </p>
                  </div>

                  {/* Right Leg */}
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">Right Leg</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">₱{binaryPosition?.right_volume?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Volume</p>
                    </div>
                    <Progress value={rightPercent} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {rightPercent.toFixed(1)}% to next cycle
                    </p>
                  </div>
                </div>

                {/* Cycle Info */}
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-sm">
                    <span className="font-medium">Cycle requirement:</span> ₱{settings.cycleVolume} matched on both legs
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Earn ₱{settings.cycleCommission} per completed cycle
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Replenish Info */}
            {settings.autoReplenishEnabled && (
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Auto-Replenish Active</p>
                      <p className="text-xs text-muted-foreground">
                        {settings.autoReplenishPercent}% of your unilevel, stair-step, and leadership commissions 
                        will automatically replenish your AI credits.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Buy More Credits */}
            <Button onClick={onBuyCredits} className="w-full gap-2" variant="outline">
              <Sparkles className="h-4 w-4" />
              Buy More AI Credits
            </Button>
          </>
        )}
      </div>
    </ScrollArea>
  );
}