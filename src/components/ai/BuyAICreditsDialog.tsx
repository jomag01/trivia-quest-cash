import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, ImageIcon, VideoIcon, Sparkles, Check, Loader2, CreditCard, Wallet, ArrowUp } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'paymongo'>('credits');
  const [userCredits, setUserCredits] = useState(0);
  const [currentUserTier, setCurrentUserTier] = useState<number>(-1);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
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
        // Find which tier this amount corresponds to
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
      // Calculate commission distribution
      const affiliatePool = tier.price * (1 - commissionSettings.adminPercent / 100);
      const totalCommissionPercent = commissionSettings.unilevelPercent + commissionSettings.stairstepPercent + commissionSettings.leadershipPercent;
      
      const adminEarnings = tier.price * (commissionSettings.adminPercent / 100);
      const unilevelCommission = affiliatePool * (commissionSettings.unilevelPercent / totalCommissionPercent);
      const stairstepCommission = affiliatePool * (commissionSettings.stairstepPercent / totalCommissionPercent);
      const leadershipCommission = affiliatePool * (commissionSettings.leadershipPercent / totalCommissionPercent);

      // Get user's referrer
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', user.id)
        .single();

      // Deduct credits and add AI credits
      const newCredits = (userCredits - tier.price) + tier.credits;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record the purchase
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

      // Distribute commissions if referrer exists
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
    if (selectedTier === null || !user) return;

    const tier = tiers[selectedTier];

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: tier.price * 100, // PayMongo uses centavos
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

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Failed to create payment');
      setPurchasing(false);
    }
  };

  const handlePurchase = () => {
    if (paymentMethod === 'credits') {
      handlePurchaseWithCredits();
    } else {
      handlePurchaseWithPayMongo();
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
            Buy AI Credits
          </DialogTitle>
          <DialogDescription>
            Choose a credit package to unlock more AI generations
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
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
                        <span>~{tier.images} images</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <VideoIcon className="h-4 w-4" />
                        <span>~{tier.videos} videos</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Payment Method</h4>
              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'credits' | 'paymongo')}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="credits" className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Use Credits/Diamonds
                  </TabsTrigger>
                  <TabsTrigger value="paymongo" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pay with Card/GCash
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="credits" className="mt-3">
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <p>Your balance: <strong>₱{userCredits}</strong></p>
                    {selectedTier !== null && userCredits < tiers[selectedTier].price && (
                      <p className="text-destructive mt-1">
                        Insufficient credits. You need ₱{tiers[selectedTier].price - userCredits} more.
                      </p>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="paymongo" className="mt-3">
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <p>Pay securely with GCash, Maya, or Credit/Debit Card via PayMongo.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Affiliate Benefits */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium text-sm mb-2">Affiliate Benefits</h4>
              <p className="text-xs text-muted-foreground">
                When you purchase credits, your referrer earns commission through the affiliate network!
                Commissions are distributed across Unilevel ({commissionSettings.unilevelPercent}%), 
                Stair-Step ({commissionSettings.stairstepPercent}%), and 
                Leadership ({commissionSettings.leadershipPercent}%) programs.
              </p>
            </div>

            {/* Upgrade Button for existing users */}
            {currentUserTier >= 0 && currentUserTier < tiers.length - 1 && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Current Tier: {getTierLabel(currentUserTier)}</p>
                    <p className="text-xs text-muted-foreground">
                      Daily Cap: ₱{tiers[currentUserTier]?.dailyCap?.toLocaleString() || 0}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setShowUpgradeDialog(true)}
                  >
                    <ArrowUp className="h-4 w-4" />
                    Upgrade Tier
                  </Button>
                </div>
              </div>
            )}

            {/* Purchase Button */}
            <div className="flex items-center justify-end pt-4 border-t">
              <Button
                onClick={handlePurchase}
                disabled={
                  selectedTier === null || 
                  purchasing || 
                  (paymentMethod === 'credits' && selectedTier !== null && userCredits < tiers[selectedTier].price)
                }
                className="gap-2"
              >
                {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedTier !== null
                  ? paymentMethod === 'credits' 
                    ? `Purchase ${tiers[selectedTier]?.credits} Credits`
                    : `Pay ₱${tiers[selectedTier]?.price}`
                  : 'Select a Package'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Tier Upgrade Dialog */}
      <TierUpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTierIndex={currentUserTier}
        onUpgradeComplete={() => {
          fetchUserTier();
          onPurchaseComplete?.();
        }}
      />
    </Dialog>
  );
}