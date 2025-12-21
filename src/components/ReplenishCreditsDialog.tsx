import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Crown, 
  ImageIcon, 
  VideoIcon, 
  Music,
  Sparkles, 
  Check, 
  Loader2, 
  Wallet,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Copy,
  CheckCircle2
} from 'lucide-react';

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

interface ReplenishCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplenishComplete?: () => void;
}

export default function ReplenishCreditsDialog({ open, onOpenChange, onReplenishComplete }: ReplenishCreditsDialogProps) {
  const { user, profile } = useAuth();
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
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [replenishMethod, setReplenishMethod] = useState<'earnings' | 'buy'>('earnings');
  const [userEarnings, setUserEarnings] = useState(0);
  const [userCredits, setUserCredits] = useState(0);
  const [commissionSettings, setCommissionSettings] = useState({
    unilevelPercent: 40,
    stairstepPercent: 35,
    leadershipPercent: 25
  });
  
  // Payment method states
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'paymongo' | 'qrcode'>('paymongo');
  const [paymongoMethod, setPaymongoMethod] = useState<'gcash' | 'paymaya' | 'card' | 'grab_pay'>('gcash');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [bankDetails, setBankDetails] = useState({ accountName: '', accountNumber: '', bankName: '' });
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showQrSuccess, setShowQrSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchUserBalance();
    }
  }, [open]);

  const fetchUserBalance = async () => {
    if (!user) return;
    try {
      const [walletResult, profileResult] = await Promise.all([
        supabase.from('user_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('credits').eq('id', user.id).single()
      ]);

      setUserEarnings(walletResult.data?.balance || 0);
      setUserCredits(profileResult.data?.credits || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .or('key.like.ai_%,key.like.qr_%,key.like.bank_%');

      const tierData: CreditTier[] = [
        { price: 100, cost: 30, credits: 50, images: 30, videos: 10, maxVideoSeconds: 10, maxAudioSeconds: 60 },
        { price: 250, cost: 75, credits: 150, images: 100, videos: 30, maxVideoSeconds: 60, maxAudioSeconds: 300 },
        { price: 500, cost: 150, credits: 400, images: 300, videos: 80, maxVideoSeconds: 900, maxAudioSeconds: 1800 }
      ];

      const rates: CreditRates = { creditsPerVideoMinute: 20, creditsPerAudioMinute: 5, creditsPerImage: 1 };
      let newBankDetails = { accountName: '', accountNumber: '', bankName: '' };
      let newQrCodeUrl = '';

      data?.forEach(setting => {
        const match = setting.key.match(/ai_credit_tier_(\d)_(\w+)/);
        if (match) {
          const tierIndex = parseInt(match[1]) - 1;
          const field = match[2];
          if (tierIndex >= 0 && tierIndex < 3) {
            if (field === 'price') tierData[tierIndex].price = parseFloat(setting.value || '0');
            if (field === 'cost') tierData[tierIndex].cost = parseFloat(setting.value || '0');
            if (field === 'credits') tierData[tierIndex].credits = parseInt(setting.value || '0');
            if (field === 'image') tierData[tierIndex].images = parseInt(setting.value || '0');
            if (field === 'video') tierData[tierIndex].videos = parseInt(setting.value || '0');
            if (field === 'videoseconds') tierData[tierIndex].maxVideoSeconds = parseInt(setting.value || '0');
            if (field === 'audioseconds') tierData[tierIndex].maxAudioSeconds = parseInt(setting.value || '0');
          }
        }
        if (setting.key === 'ai_credits_per_video_minute') {
          rates.creditsPerVideoMinute = parseFloat(setting.value || '20');
        }
        if (setting.key === 'ai_credits_per_audio_minute') {
          rates.creditsPerAudioMinute = parseFloat(setting.value || '5');
        }
        if (setting.key === 'ai_credits_per_image') {
          rates.creditsPerImage = parseFloat(setting.value || '1');
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
        // QR and bank details
        if (setting.key === 'qr_code_url') {
          newQrCodeUrl = setting.value || '';
        }
        if (setting.key === 'bank_account_name') {
          newBankDetails.accountName = setting.value || '';
        }
        if (setting.key === 'bank_account_number') {
          newBankDetails.accountNumber = setting.value || '';
        }
        if (setting.key === 'bank_name') {
          newBankDetails.bankName = setting.value || '';
        }
      });

      setTiers(tierData);
      setCreditRates(rates);
      setQrCodeUrl(newQrCodeUrl);
      setBankDetails(newBankDetails);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
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

  const handleReplenishWithEarnings = async () => {
    if (selectedTier === null || !user) return;
    const tier = tiers[selectedTier];
    const allocation = calculateServiceAllocation();

    if (!selectedServices.images && !selectedServices.video && !selectedServices.audio) {
      toast.error('Please select at least one AI service');
      return;
    }

    if (userEarnings < tier.price) {
      toast.error(`Insufficient earnings. You need ₱${tier.price} but have ₱${userEarnings.toFixed(2)}`);
      return;
    }

    setPurchasing(true);
    try {
      // Deduct from earnings
      const { error: walletError } = await supabase
        .from('user_wallets')
        .update({ balance: userEarnings - tier.price })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Add AI credits with selected services
      const { data: existingCredits } = await supabase
        .from('user_ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const totalCredits = tier.credits + Math.floor(allocation.bonusCredits);

      if (existingCredits) {
        await supabase
          .from('user_ai_credits')
          .update({
            images_available: existingCredits.images_available + allocation.images,
            video_minutes_available: Number(existingCredits.video_minutes_available) + (allocation.videoSeconds / 60),
            audio_minutes_available: Number(existingCredits.audio_minutes_available) + (allocation.audioSeconds / 60),
            total_credits: existingCredits.total_credits + totalCredits
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_ai_credits')
          .insert({
            user_id: user.id,
            images_available: allocation.images,
            video_minutes_available: allocation.videoSeconds / 60,
            audio_minutes_available: allocation.audioSeconds / 60,
            total_credits: totalCredits
          });
      }

      toast.success(`Replenished ${totalCredits} AI credits from earnings!`);
      setSelectedServices({ images: true, video: true, audio: true });
      onReplenishComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Replenish error:', error);
      toast.error(error.message || 'Failed to replenish credits');
    } finally {
      setPurchasing(false);
    }
  };

  const placeMeInBinaryNetwork = async (userId: string, sponsorId: string | null) => {
    try {
      // Check if user is already in binary network
      const { data: existingNode } = await supabase
        .from('binary_network')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingNode) {
        console.log('User already in binary network');
        return; // Already enrolled
      }

      // If no sponsor, this is the first user (root node)
      if (!sponsorId) {
        const { error } = await supabase.from('binary_network').insert({
          user_id: userId,
          sponsor_id: null,
          parent_id: null,
          placement_leg: null,
          left_child_id: null,
          right_child_id: null,
          left_volume: 0,
          right_volume: 0,
          total_cycles: 0
        });

        if (error) throw error;
        toast.success('You are now the root of the binary network!');
        return;
      }

      // Get sponsor's binary network node
      const { data: sponsorNode } = await supabase
        .from('binary_network')
        .select('*')
        .eq('user_id', sponsorId)
        .maybeSingle();

      if (!sponsorNode) {
        // Sponsor not in network yet, place under root or create as root
        const { data: rootNode } = await supabase
          .from('binary_network')
          .select('*')
          .is('parent_id', null)
          .maybeSingle();

        if (!rootNode) {
          // No root exists, make this user the root
          const { error } = await supabase.from('binary_network').insert({
            user_id: userId,
            sponsor_id: null,
            parent_id: null,
            placement_leg: null
          });
          if (error) throw error;
          toast.success('You are now the root of the binary network!');
          return;
        }

        // Place under root's weaker leg
        await placeUnderNode(userId, rootNode, sponsorId);
        return;
      }

      // Place under sponsor using weaker leg strategy
      await placeUnderNode(userId, sponsorNode, sponsorId);
    } catch (error) {
      console.error('Binary placement error:', error);
    }
  };

  const placeUnderNode = async (userId: string, parentNode: any, sponsorId: string | null) => {
    // Determine weaker leg (or left if equal)
    const placementLeg = (parentNode.left_volume || 0) <= (parentNode.right_volume || 0) ? 'left' : 'right';
    
    // Check if the leg is available
    if (placementLeg === 'left' && !parentNode.left_child_id) {
      // Place directly in left leg
      const { data: newNode, error: insertError } = await supabase
        .from('binary_network')
        .insert({
          user_id: userId,
          sponsor_id: parentNode.id,
          parent_id: parentNode.id,
          placement_leg: 'left'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update parent's left child
      await supabase
        .from('binary_network')
        .update({ left_child_id: newNode.id })
        .eq('id', parentNode.id);

      toast.success('Placed in binary network (left leg)!');
    } else if (placementLeg === 'right' && !parentNode.right_child_id) {
      // Place directly in right leg
      const { data: newNode, error: insertError } = await supabase
        .from('binary_network')
        .insert({
          user_id: userId,
          sponsor_id: parentNode.id,
          parent_id: parentNode.id,
          placement_leg: 'right'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update parent's right child
      await supabase
        .from('binary_network')
        .update({ right_child_id: newNode.id })
        .eq('id', parentNode.id);

      toast.success('Placed in binary network (right leg)!');
    } else {
      // Need to find next available spot in the weaker leg
      const childId = placementLeg === 'left' ? parentNode.left_child_id : parentNode.right_child_id;
      
      if (childId) {
        const { data: childNode } = await supabase
          .from('binary_network')
          .select('*')
          .eq('id', childId)
          .single();

        if (childNode) {
          await placeUnderNode(userId, childNode, sponsorId);
        }
      }
    }
  };

  const handleBuyCredits = async () => {
    if (selectedTier === null || !user) return;
    const tier = tiers[selectedTier];
    const allocation = calculateServiceAllocation();

    if (!selectedServices.images && !selectedServices.video && !selectedServices.audio) {
      toast.error('Please select at least one AI service');
      return;
    }

    setPurchasing(true);
    
    try {
      // Get referrer for commission distribution
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', user.id)
        .single();

      // Check if this is user's first purchase
      const { data: previousPurchases } = await supabase
        .from('binary_ai_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(1);

      const isFirstPurchase = !previousPurchases || previousPurchases.length === 0;
      const totalCredits = tier.credits + Math.floor(allocation.bonusCredits);

      if (paymentMethod === 'credits') {
        // Using platform wallet credits
        if (userCredits < tier.price) {
          toast.error(`Insufficient credits. You need ₱${tier.price} but have ₱${userCredits}`);
          setPurchasing(false);
          return;
        }

        // Deduct credits and submit for approval
        await supabase
          .from('profiles')
          .update({ credits: userCredits - tier.price })
          .eq('id', user.id);

        // Create pending purchase for admin approval with selected services
        await supabase.from('binary_ai_purchases').insert({
          user_id: user.id,
          amount: tier.price,
          credits_received: totalCredits,
          images_allocated: allocation.images,
          video_minutes_allocated: allocation.videoSeconds / 60,
          audio_minutes_allocated: allocation.audioSeconds / 60,
          sponsor_id: profileData?.referred_by || null,
          status: 'pending',
          is_first_purchase: isFirstPurchase
        });

        // Place user in binary network on first purchase
        if (isFirstPurchase) {
          await placeMeInBinaryNetwork(user.id, profileData?.referred_by || null);
        }

        // Distribute commissions through unilevel, stairstep, leadership
        if (profileData?.referred_by) {
          await distributeCommissions(profileData.referred_by, tier.price);
        }

        toast.success('Purchase submitted for admin approval! Credits will be added once approved.');
        setSelectedServices({ images: true, video: true, audio: true });
        onReplenishComplete?.();
        onOpenChange(false);
      } else if (paymentMethod === 'paymongo') {
        // PayMongo payment
        const { data, error } = await supabase.functions.invoke('create-payment', {
          body: {
            amount: tier.price,
            description: `AI Credits Package - ${tier.credits} credits`,
            paymentMethod: paymongoMethod,
            metadata: {
              type: 'ai_credits',
              tier_index: selectedTier,
              credits: totalCredits,
              images: allocation.images,
              video_minutes: allocation.videoSeconds / 60,
              audio_minutes: allocation.audioSeconds / 60,
              is_first_purchase: isFirstPurchase
            }
          }
        });

        if (error) throw error;
        
        if (data?.checkout_url) {
          window.open(data.checkout_url, '_blank');
          toast.success('Redirecting to payment...', {
            description: 'Complete payment in the new tab'
          });
          onOpenChange(false);
        } else {
          throw new Error('No checkout URL received');
        }
      } else if (paymentMethod === 'qrcode') {
        // QR/Bank transfer - requires reference number
        if (!referenceNumber.trim()) {
          toast.error('Please enter your payment reference number');
          setPurchasing(false);
          return;
        }

        // Create pending purchase with reference for admin approval
        await supabase.from('binary_ai_purchases').insert({
          user_id: user.id,
          amount: tier.price,
          credits_received: totalCredits,
          images_allocated: allocation.images,
          video_minutes_allocated: allocation.videoSeconds / 60,
          audio_minutes_allocated: allocation.audioSeconds / 60,
          sponsor_id: profileData?.referred_by || null,
          status: 'pending',
          is_first_purchase: isFirstPurchase,
          admin_notes: `QR/Bank Payment - Reference: ${referenceNumber}`
        });

        // Place user in binary network on first purchase
        if (isFirstPurchase) {
          await placeMeInBinaryNetwork(user.id, profileData?.referred_by || null);
        }

        setShowQrSuccess(true);
        setReferenceNumber('');
        toast.success('Payment submitted for verification!', {
          description: 'Credits will be added once admin approves'
        });
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to process purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const distributeCommissions = async (referrerId: string, amount: number) => {
    try {
      const affiliatePool = amount * 0.65; // 65% to affiliates
      const totalPercent = commissionSettings.unilevelPercent + commissionSettings.stairstepPercent + commissionSettings.leadershipPercent;

      // Unilevel commission to direct referrer
      const unilevelAmount = affiliatePool * (commissionSettings.unilevelPercent / totalPercent);
      
      await supabase.from('commissions').insert({
        user_id: referrerId,
        from_user_id: user!.id,
        amount: unilevelAmount,
        commission_type: 'ai_credit_unilevel',
        level: 1,
        notes: `AI Credit replenishment commission`
      });

      // Update referrer's wallet
      const { data: referrerWallet } = await supabase
        .from('user_wallets')
        .select('balance, total_commissions')
        .eq('user_id', referrerId)
        .maybeSingle();

      if (referrerWallet) {
        await supabase
          .from('user_wallets')
          .update({
            balance: referrerWallet.balance + unilevelAmount,
            total_commissions: (referrerWallet.total_commissions || 0) + unilevelAmount
          })
          .eq('user_id', referrerId);
      }
    } catch (error) {
      console.error('Error distributing commissions:', error);
    }
  };

  const getTierLabel = (index: number) => {
    const labels = ['Starter', 'Popular', 'Pro'];
    return labels[index] || `Tier ${index + 1}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Replenish AI Credits
          </DialogTitle>
          <DialogDescription>
            Use your earnings or buy credits to replenish your AI allocations
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Replenish Method Selection */}
            <Tabs value={replenishMethod} onValueChange={(v) => setReplenishMethod(v as 'earnings' | 'buy')}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="earnings" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Use Earnings (₱{userEarnings.toFixed(2)})
                </TabsTrigger>
                <TabsTrigger value="buy" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Buy Credits (₱{userCredits})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="earnings" className="mt-3">
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                  <p className="font-medium text-green-600 dark:text-green-400">💰 Using Your Earnings</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Replenish credits directly from your commission earnings without purchasing.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="buy" className="mt-3">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                  <p className="font-medium text-blue-600 dark:text-blue-400">🛒 Buying Credits</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Purchase credits to earn commissions for your upline through unilevel, stair-step, and leadership programs.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Credit Packages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTier === index ? 'border-primary ring-2 ring-primary/20' : ''
                  } ${index === 1 ? 'border-primary/50' : ''}`}
                  onClick={() => setSelectedTier(index)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{getTierLabel(index)}</span>
                      {index === 1 && (
                        <Badge variant="default" className="text-xs">Best Value</Badge>
                      )}
                      {selectedTier === index && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    
                    <div className="text-2xl font-bold">₱{tier.price}</div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span>{tier.credits} AI Credits</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                        <span>{tier.images} images</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <VideoIcon className="h-4 w-4" />
                        <span>{formatSeconds(tier.maxVideoSeconds)} video</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Music className="h-4 w-4" />
                        <span>{formatSeconds(tier.maxAudioSeconds)} audio</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Service Selection */}
            {selectedTier !== null && (
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                <p className="font-medium text-sm">Select AI Services:</p>
                <p className="text-xs text-muted-foreground">Unselected services convert to bonus credits.</p>
                
                <div className="text-xs p-2 bg-background rounded border mb-2">
                  <span className="font-medium">Rates: </span>
                  1 img = {creditRates.creditsPerImage} cr | 1 min video = {creditRates.creditsPerVideoMinute} cr | 1 min audio = {creditRates.creditsPerAudioMinute} cr
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1 cursor-pointer p-2 rounded border text-xs">
                    <input type="checkbox" checked={selectedServices.images} onChange={(e) => setSelectedServices(p => ({ ...p, images: e.target.checked }))} />
                    <ImageIcon className="h-3 w-3" /> Images
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer p-2 rounded border text-xs">
                    <input type="checkbox" checked={selectedServices.video} onChange={(e) => setSelectedServices(p => ({ ...p, video: e.target.checked }))} />
                    <VideoIcon className="h-3 w-3" /> Video
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer p-2 rounded border text-xs">
                    <input type="checkbox" checked={selectedServices.audio} onChange={(e) => setSelectedServices(p => ({ ...p, audio: e.target.checked }))} />
                    <Music className="h-3 w-3" /> Audio
                  </label>
                </div>

                {(() => {
                  const allocation = calculateServiceAllocation();
                  return allocation.bonusCredits > 0 ? (
                    <p className="text-xs text-green-600">+{Math.floor(allocation.bonusCredits)} bonus credits from unused services</p>
                  ) : null;
                })()}
              </div>
            )}

            {/* Payment Method Selection - Only show for Buy tab */}
            {replenishMethod === 'buy' && selectedTier !== null && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Select Payment Method
                </h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setPaymentMethod('paymongo')}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'paymongo'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                        : 'border-border hover:border-purple-400/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${paymentMethod === 'paymongo' ? 'bg-purple-500' : 'bg-muted'}`}>
                      <CreditCard className={`h-4 w-4 ${paymentMethod === 'paymongo' ? 'text-white' : ''}`} />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-xs">Pay Online</div>
                      <div className="text-xs text-muted-foreground">GCash, Maya</div>
                    </div>
                    {paymentMethod === 'paymongo' && <Check className="h-4 w-4 text-purple-500" />}
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('qrcode')}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'qrcode'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-border hover:border-blue-400/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${paymentMethod === 'qrcode' ? 'bg-blue-500' : 'bg-muted'}`}>
                      <QrCode className={`h-4 w-4 ${paymentMethod === 'qrcode' ? 'text-white' : ''}`} />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-xs">QR / Bank</div>
                      <div className="text-xs text-muted-foreground">Transfer</div>
                    </div>
                    {paymentMethod === 'qrcode' && <Check className="h-4 w-4 text-blue-500" />}
                  </button>
                  
                  <button
                    onClick={() => setPaymentMethod('credits')}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      paymentMethod === 'credits'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                        : 'border-border hover:border-green-400/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${paymentMethod === 'credits' ? 'bg-green-500' : 'bg-muted'}`}>
                      <Wallet className={`h-4 w-4 ${paymentMethod === 'credits' ? 'text-white' : ''}`} />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-xs">Balance</div>
                      <div className="text-xs text-muted-foreground">₱{userCredits}</div>
                    </div>
                    {paymentMethod === 'credits' && <Check className="h-4 w-4 text-green-500" />}
                  </button>
                </div>

                {/* PayMongo Options */}
                {paymentMethod === 'paymongo' && (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={paymongoMethod} 
                      onValueChange={(v) => setPaymongoMethod(v as any)} 
                      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
                    >
                      {[
                        { value: 'gcash', label: 'GCash', bg: 'bg-blue-500' },
                        { value: 'paymaya', label: 'Maya', bg: 'bg-green-500' },
                        { value: 'card', label: 'Card', bg: 'bg-purple-500' },
                        { value: 'grab_pay', label: 'GrabPay', bg: 'bg-emerald-500' }
                      ].map(method => (
                        <div key={method.value}>
                          <RadioGroupItem value={method.value} id={`replenish-${method.value}`} className="peer sr-only" />
                          <Label
                            htmlFor={`replenish-${method.value}`}
                            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-2 cursor-pointer transition-all ${
                              paymongoMethod === method.value 
                                ? `border-transparent ${method.bg} text-white` 
                                : 'border-muted hover:border-primary/50'
                            }`}
                          >
                            <Smartphone className="h-4 w-4" />
                            <span className="text-xs font-medium">{method.label}</span>
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
                      <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-center">
                        <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                        <h4 className="font-bold text-green-700 dark:text-green-300 mb-1">Payment Submitted!</h4>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Credits will be added once admin verifies your payment.
                        </p>
                        <Button
                          onClick={() => setShowQrSuccess(false)}
                          variant="outline"
                          size="sm"
                          className="mt-3"
                        >
                          Submit Another Payment
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* QR Code Display */}
                        {qrCodeUrl ? (
                          <div className="flex flex-col items-center p-3 rounded-lg bg-white dark:bg-slate-900 border">
                            <p className="text-xs text-muted-foreground mb-2">Scan QR code to pay</p>
                            <img 
                              src={qrCodeUrl} 
                              alt="Payment QR Code" 
                              className="w-36 h-36 object-contain rounded-lg border"
                            />
                            <p className="mt-2 text-lg font-bold text-primary">
                              Amount: ₱{tiers[selectedTier].price}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                            <Building2 className="h-8 w-8 text-amber-500 mx-auto mb-1" />
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              No QR code available. Use bank transfer below.
                            </p>
                          </div>
                        )}

                        {/* Bank Details */}
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                          <h5 className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4" />
                            Bank Transfer Details
                          </h5>
                          
                          {(bankDetails.accountName || bankDetails.accountNumber || bankDetails.bankName) ? (
                            <div className="space-y-2 text-sm">
                              {bankDetails.bankName && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Bank:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs">{bankDetails.bankName}</span>
                                    <button onClick={() => copyToClipboard(bankDetails.bankName, 'bank')}>
                                      {copiedField === 'bank' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                              {bankDetails.accountName && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Account Name:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs">{bankDetails.accountName}</span>
                                    <button onClick={() => copyToClipboard(bankDetails.accountName, 'name')}>
                                      {copiedField === 'name' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                              {bankDetails.accountNumber && (
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-muted-foreground">Account Number:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium font-mono text-xs">{bankDetails.accountNumber}</span>
                                    <button onClick={() => copyToClipboard(bankDetails.accountNumber, 'number')}>
                                      {copiedField === 'number' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground hover:text-primary" />}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-2">
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Bank details not yet configured by admin.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Reference Number Input */}
                        <div className="space-y-2">
                          <Label htmlFor="replenish-reference" className="text-xs font-medium">
                            Payment Reference Number <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="replenish-reference"
                            placeholder="Enter your payment reference/transaction ID"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            className="h-10"
                          />
                          <p className="text-xs text-muted-foreground">
                            Enter the reference number from your payment confirmation
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Wallet balance warning */}
                {paymentMethod === 'credits' && userCredits < tiers[selectedTier].price && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Insufficient balance. You need ₱{tiers[selectedTier].price} but have ₱{userCredits}. 
                      Please use another payment method.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Commission Info */}
            {replenishMethod === 'buy' && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <h4 className="font-medium text-sm mb-1">Affiliate Commission Distribution</h4>
                <p className="text-xs text-muted-foreground">
                  Your purchase earns commissions for your referrer:
                  Unilevel ({commissionSettings.unilevelPercent}%), 
                  Stair-Step ({commissionSettings.stairstepPercent}%), 
                  Leadership ({commissionSettings.leadershipPercent}%)
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="flex items-center justify-end pt-4 border-t">
              <Button
                onClick={replenishMethod === 'earnings' ? handleReplenishWithEarnings : handleBuyCredits}
                disabled={
                  selectedTier === null || 
                  purchasing ||
                  (!selectedServices.images && !selectedServices.video && !selectedServices.audio) ||
                  (replenishMethod === 'earnings' && selectedTier !== null && userEarnings < tiers[selectedTier].price) ||
                  (replenishMethod === 'buy' && paymentMethod === 'credits' && selectedTier !== null && userCredits < tiers[selectedTier].price) ||
                  (replenishMethod === 'buy' && paymentMethod === 'qrcode' && showQrSuccess)
                }
                className="gap-2"
              >
                {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedTier !== null
                  ? `${replenishMethod === 'earnings' ? 'Replenish' : 'Buy'} ${tiers[selectedTier]?.credits + Math.floor(calculateServiceAllocation().bonusCredits)} Credits`
                  : 'Select a Package'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
