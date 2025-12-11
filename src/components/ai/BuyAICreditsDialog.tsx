import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, ImageIcon, VideoIcon, Sparkles, Check, Loader2 } from 'lucide-react';

interface CreditTier {
  price: number;
  credits: number;
  images: number;
  videos: number;
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
  const [commissionSettings, setCommissionSettings] = useState({
    adminPercent: 35,
    unilevelPercent: 40,
    stairstepPercent: 35,
    leadershipPercent: 25
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'ai_%');

      const tierData: CreditTier[] = [
        { price: 100, credits: 50, images: 30, videos: 10 },
        { price: 250, credits: 150, images: 100, videos: 30 },
        { price: 500, credits: 400, images: 300, videos: 80 }
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

  const handlePurchase = async () => {
    if (selectedTier === null || !user) return;

    const tier = tiers[selectedTier];

    // Fetch current user credits
    const { data: userData } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single();

    const userCredits = (userData as any)?.credits || 0;

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

      // Deduct credits from user's balance
      const { error: deductError } = await supabase
        .from('profiles')
        .update({ credits: userCredits - tier.price })
        .eq('id', user.id);

      if (deductError) throw deductError;

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('ai_credit_purchases')
        .insert({
          user_id: user.id,
          amount: tier.price,
          credits_received: tier.credits,
          referrer_id: profileData?.referred_by || null,
          admin_earnings: adminEarnings,
          unilevel_commission: unilevelCommission,
          stairstep_commission: stairstepCommission,
          leadership_commission: leadershipCommission,
          status: 'completed'
        });

      if (purchaseError) throw purchaseError;

      // Add AI credits to user (using a separate column or the same credits)
      // For simplicity, we'll add to the same credits field
      const { error: addError } = await supabase
        .from('profiles')
        .update({ credits: (userCredits - tier.price) + tier.credits })
        .eq('id', user.id);

      if (addError) throw addError;

      // If user has a referrer, distribute commissions
      if (profileData?.referred_by) {
        // Record commission for referrer (simplified - real implementation would use the full commission system)
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

            <div className="p-4 rounded-lg bg-muted/50 border">
              <h4 className="font-medium text-sm mb-2">Affiliate Benefits</h4>
              <p className="text-xs text-muted-foreground">
                When you purchase credits, your referrer earns commission through the affiliate network!
                Commissions are distributed across Unilevel ({commissionSettings.unilevelPercent}%), 
                Stair-Step ({commissionSettings.stairstepPercent}%), and 
                Leadership ({commissionSettings.leadershipPercent}%) programs.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Your balance: <strong>Check your profile</strong>
              </div>
              <Button
                onClick={handlePurchase}
                disabled={selectedTier === null || purchasing}
                className="gap-2"
              >
                {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedTier !== null
                  ? `Purchase ${tiers[selectedTier]?.credits} Credits`
                  : 'Select a Package'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}