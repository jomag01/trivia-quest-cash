import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ShoppingCart
} from 'lucide-react';

interface CreditTier {
  price: number;
  cost: number;
  credits: number;
  images: number;
  videos: number;
  audioMinutes: number;
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
        .like('key', 'ai_%');

      const tierData: CreditTier[] = [
        { price: 100, cost: 30, credits: 50, images: 30, videos: 10, audioMinutes: 15 },
        { price: 250, cost: 75, credits: 150, images: 100, videos: 30, audioMinutes: 45 },
        { price: 500, cost: 150, credits: 400, images: 300, videos: 80, audioMinutes: 120 }
      ];

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
            if (field === 'audio_minutes') tierData[tierIndex].audioMinutes = parseFloat(setting.value || '0');
          }
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
      });

      setTiers(tierData);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReplenishWithEarnings = async () => {
    if (selectedTier === null || !user) return;
    const tier = tiers[selectedTier];

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

      // Add AI credits
      const { data: existingCredits } = await supabase
        .from('user_ai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCredits) {
        await supabase
          .from('user_ai_credits')
          .update({
            images_available: existingCredits.images_available + tier.images,
            video_minutes_available: Number(existingCredits.video_minutes_available) + (tier.videos * 0.5), // Assume 30 sec per video
            audio_minutes_available: Number(existingCredits.audio_minutes_available) + tier.audioMinutes,
            total_credits: existingCredits.total_credits + tier.credits
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_ai_credits')
          .insert({
            user_id: user.id,
            images_available: tier.images,
            video_minutes_available: tier.videos * 0.5,
            audio_minutes_available: tier.audioMinutes,
            total_credits: tier.credits
          });
      }

      toast.success(`Replenished ${tier.credits} AI credits from earnings!`);
      onReplenishComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Replenish error:', error);
      toast.error(error.message || 'Failed to replenish credits');
    } finally {
      setPurchasing(false);
    }
  };

  const handleBuyCredits = async () => {
    if (selectedTier === null || !user) return;
    const tier = tiers[selectedTier];

    // Check if using platform credits or need PayMongo
    if (userCredits >= tier.price) {
      setPurchasing(true);
      try {
        // Get referrer for commission distribution
        const { data: profileData } = await supabase
          .from('profiles')
          .select('referred_by')
          .eq('id', user.id)
          .single();

        // Deduct credits and submit for approval
        await supabase
          .from('profiles')
          .update({ credits: userCredits - tier.price })
          .eq('id', user.id);

        // Create pending purchase for admin approval
        await supabase.from('binary_ai_purchases').insert({
          user_id: user.id,
          amount: tier.price,
          credits_received: tier.credits,
          images_allocated: tier.images,
          video_minutes_allocated: tier.videos * 0.5,
          audio_minutes_allocated: tier.audioMinutes,
          sponsor_id: profileData?.referred_by || null,
          status: 'pending',
          is_first_purchase: false
        });

        // Distribute commissions through unilevel, stairstep, leadership
        if (profileData?.referred_by) {
          await distributeCommissions(profileData.referred_by, tier.price);
        }

        toast.success('Purchase submitted for admin approval! Credits will be added once approved.');
        onReplenishComplete?.();
        onOpenChange(false);
      } catch (error: any) {
        console.error('Purchase error:', error);
        toast.error(error.message || 'Failed to submit purchase');
      } finally {
        setPurchasing(false);
      }
    } else {
      toast.error(`Insufficient credits. You need ₱${tier.price} but have ₱${userCredits}`);
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
                        <span>{(tier.videos * 0.5).toFixed(1)} video min</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Music className="h-4 w-4" />
                        <span>{tier.audioMinutes} audio min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Commission Info */}
            {replenishMethod === 'buy' && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-medium text-sm mb-2">Affiliate Commission Distribution</h4>
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
                  (replenishMethod === 'earnings' && selectedTier !== null && userEarnings < tiers[selectedTier].price) ||
                  (replenishMethod === 'buy' && selectedTier !== null && userCredits < tiers[selectedTier].price)
                }
                className="gap-2"
              >
                {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedTier !== null
                  ? replenishMethod === 'earnings'
                    ? `Replenish ${tiers[selectedTier]?.credits} Credits`
                    : `Buy ${tiers[selectedTier]?.credits} Credits`
                  : 'Select a Package'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
