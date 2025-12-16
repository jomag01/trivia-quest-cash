import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowUp, Loader2, Sparkles, Check, TrendingUp } from 'lucide-react';

interface CreditTier {
  name: string;
  price: number;
  credits: number;
  images: number;
  videos: number;
  cost: number;
  dailyCap: number;
}

interface TierUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTierIndex: number;
  onUpgradeComplete?: () => void;
}

export default function TierUpgradeDialog({ 
  open, 
  onOpenChange, 
  currentTierIndex,
  onUpgradeComplete 
}: TierUpgradeDialogProps) {
  const { user, profile } = useAuth();
  const [tiers, setTiers] = useState<CreditTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [commissionSettings, setCommissionSettings] = useState({
    adminPercent: 35,
    upgradeUnilevelPercent: 40,
    upgradeStairstepPercent: 35,
    upgradeLeadershipPercent: 25
  });

  useEffect(() => {
    if (open) {
      fetchSettings();
      fetchUserCredits();
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

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .or('key.like.ai_%,key.like.binary_%');

      const tierData: CreditTier[] = [];
      const tierCount = data?.find(s => s.key === 'ai_tier_count');
      const count = tierCount ? parseInt(tierCount.value || '3') : 3;

      for (let i = 0; i < count; i++) {
        tierData.push({
          name: `Tier ${i + 1}`,
          price: 0,
          credits: 0,
          images: 0,
          videos: 0,
          cost: 0,
          dailyCap: 5000
        });
      }

      data?.forEach(setting => {
        const match = setting.key.match(/ai_credit_tier_(\d+)_(\w+)/);
        if (match) {
          const tierIndex = parseInt(match[1]) - 1;
          const field = match[2];
          if (tierIndex >= 0 && tierIndex < tierData.length) {
            if (field === 'name') tierData[tierIndex].name = setting.value || `Tier ${tierIndex + 1}`;
            if (field === 'price') tierData[tierIndex].price = parseInt(setting.value || '0');
            if (field === 'credits') tierData[tierIndex].credits = parseInt(setting.value || '0');
            if (field === 'image') tierData[tierIndex].images = parseInt(setting.value || '0');
            if (field === 'video') tierData[tierIndex].videos = parseInt(setting.value || '0');
            if (field === 'cost') tierData[tierIndex].cost = parseFloat(setting.value || '0');
            if (field === 'daily_cap') tierData[tierIndex].dailyCap = parseFloat(setting.value || '5000');
          }
        }
        if (setting.key === 'binary_admin_safety_net') {
          setCommissionSettings(prev => ({ ...prev, adminPercent: parseInt(setting.value || '35') }));
        }
        if (setting.key === 'binary_upgrade_unilevel_percent') {
          setCommissionSettings(prev => ({ ...prev, upgradeUnilevelPercent: parseInt(setting.value || '40') }));
        }
        if (setting.key === 'binary_upgrade_stairstep_percent') {
          setCommissionSettings(prev => ({ ...prev, upgradeStairstepPercent: parseInt(setting.value || '35') }));
        }
        if (setting.key === 'binary_upgrade_leadership_percent') {
          setCommissionSettings(prev => ({ ...prev, upgradeLeadershipPercent: parseInt(setting.value || '25') }));
        }
      });

      setTiers(tierData);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUpgrade = (toTierIndex: number) => {
    if (toTierIndex <= currentTierIndex || !tiers[currentTierIndex] || !tiers[toTierIndex]) {
      return null;
    }

    const currentTier = tiers[currentTierIndex];
    const targetTier = tiers[toTierIndex];

    const upgradeAmount = targetTier.price - currentTier.price;
    const aiCostDiff = targetTier.cost - currentTier.cost;
    const adminKeeps = (upgradeAmount * commissionSettings.adminPercent) / 100;
    const netForCommissions = Math.max(0, upgradeAmount - aiCostDiff - adminKeeps);

    const totalPercent = commissionSettings.upgradeUnilevelPercent + 
                         commissionSettings.upgradeStairstepPercent + 
                         commissionSettings.upgradeLeadershipPercent;

    const unilevelAmount = netForCommissions * (commissionSettings.upgradeUnilevelPercent / totalPercent);
    const stairstepAmount = netForCommissions * (commissionSettings.upgradeStairstepPercent / totalPercent);
    const leadershipAmount = netForCommissions * (commissionSettings.upgradeLeadershipPercent / totalPercent);

    const additionalCredits = targetTier.credits - currentTier.credits;
    const additionalImages = targetTier.images - currentTier.images;
    const additionalVideos = targetTier.videos - currentTier.videos;
    const newDailyCap = targetTier.dailyCap;

    return {
      upgradeAmount,
      aiCostDiff,
      adminKeeps,
      netForCommissions,
      unilevelAmount,
      stairstepAmount,
      leadershipAmount,
      additionalCredits,
      additionalImages,
      additionalVideos,
      newDailyCap,
      targetTier
    };
  };

  const handleUpgrade = async () => {
    if (selectedTier === null || !user) return;

    const calc = calculateUpgrade(selectedTier);
    if (!calc) return;

    if (userCredits < calc.upgradeAmount) {
      toast.error(`Insufficient credits. You need ₱${calc.upgradeAmount} to upgrade.`);
      return;
    }

    setUpgrading(true);
    try {
      // Get user's referrer for commission distribution
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referred_by')
        .eq('id', user.id)
        .single();

      // Deduct credits and update tier
      const newCredits = userCredits - calc.upgradeAmount;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Record the upgrade purchase with commission breakdown
      await supabase.from('ai_credit_purchases').insert({
        user_id: user.id,
        amount: calc.upgradeAmount,
        credits_received: calc.additionalCredits,
        status: 'completed',
        admin_notes: `Upgrade from Tier ${currentTierIndex + 1} to Tier ${selectedTier + 1}`
      });

      // Distribute commissions if referrer exists
      if (profileData?.referred_by) {
        // Unilevel commission
        if (calc.unilevelAmount > 0) {
          await supabase.from('commissions').insert({
            user_id: profileData.referred_by,
            from_user_id: user.id,
            amount: calc.unilevelAmount,
            commission_type: 'ai_upgrade_unilevel',
            level: 1,
            notes: `AI tier upgrade unilevel commission (Tier ${currentTierIndex + 1} → ${selectedTier + 1})`
          });
        }

        // Stair-step commission
        if (calc.stairstepAmount > 0) {
          await supabase.from('leadership_commissions').insert({
            upline_id: profileData.referred_by,
            downline_id: user.id,
            sales_amount: calc.upgradeAmount,
            amount: calc.stairstepAmount,
            level: 1,
            commission_type: 'ai_upgrade_stairstep',
            notes: `AI tier upgrade stair-step commission (Tier ${currentTierIndex + 1} → ${selectedTier + 1})`
          });
        }

        // Leadership commission
        if (calc.leadershipAmount > 0) {
          await supabase.from('leadership_commissions').insert({
            upline_id: profileData.referred_by,
            downline_id: user.id,
            sales_amount: calc.upgradeAmount,
            amount: calc.leadershipAmount,
            level: 1,
            commission_type: 'ai_upgrade_leadership',
            notes: `AI tier upgrade leadership commission (Tier ${currentTierIndex + 1} → ${selectedTier + 1})`
          });
        }
      }

      // Update user's current tier in binary_ai_purchases or create new record
      await supabase.from('binary_ai_purchases').upsert({
        user_id: user.id,
        amount: calc.targetTier.price,
        credits_received: calc.targetTier.credits,
        images_allocated: calc.targetTier.images,
        video_minutes_allocated: calc.targetTier.videos,
        status: 'approved',
        is_first_purchase: false,
        admin_notes: `Upgraded to ${calc.targetTier.name}`
      }, { onConflict: 'user_id' });

      toast.success(`Successfully upgraded to ${calc.targetTier.name}! Your new daily cap is ₱${calc.newDailyCap.toLocaleString()}`);
      onUpgradeComplete?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to complete upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  const availableTiers = tiers.filter((_, idx) => idx > currentTierIndex);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUp className="h-5 w-5 text-primary" />
            Upgrade Your AI Tier
          </DialogTitle>
          <DialogDescription>
            Upgrade to a higher tier for increased daily earning caps and more AI credits
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : availableTiers.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
            <p className="text-lg font-medium">You're at the highest tier!</p>
            <p className="text-muted-foreground text-sm">No upgrades available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Tier Info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground mb-1">Current Tier</p>
              <div className="flex items-center justify-between">
                <span className="font-semibold">{tiers[currentTierIndex]?.name || 'None'}</span>
                <Badge variant="outline">
                  Daily Cap: ₱{tiers[currentTierIndex]?.dailyCap.toLocaleString() || 0}
                </Badge>
              </div>
            </div>

            {/* Available Upgrades */}
            <div className="space-y-3">
              <p className="font-medium text-sm">Available Upgrades</p>
              {availableTiers.map((tier, relIdx) => {
                const actualIdx = currentTierIndex + relIdx + 1;
                const calc = calculateUpgrade(actualIdx);
                if (!calc) return null;

                return (
                  <Card
                    key={actualIdx}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedTier === actualIdx ? 'border-primary ring-2 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedTier(actualIdx)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{tier.name}</span>
                          {selectedTier === actualIdx && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <Badge className="bg-primary">
                          Upgrade: ₱{calc.upgradeAmount.toLocaleString()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-muted-foreground">New Daily Cap</p>
                          <p className="font-bold text-green-600">₱{calc.newDailyCap.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-muted-foreground">Additional Credits</p>
                          <p className="font-bold">+{calc.additionalCredits}</p>
                        </div>
                      </div>

                      {selectedTier === actualIdx && (
                        <div className="mt-4 p-3 rounded bg-muted/50 text-xs space-y-1">
                          <p className="font-medium flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Commission Distribution:
                          </p>
                          <p>• AI Cost: -₱{calc.aiCostDiff.toFixed(2)}</p>
                          <p>• Admin Profit: -₱{calc.adminKeeps.toFixed(2)}</p>
                          <p>• Unilevel Pool: ₱{calc.unilevelAmount.toFixed(2)}</p>
                          <p>• Stair-Step Pool: ₱{calc.stairstepAmount.toFixed(2)}</p>
                          <p>• Leadership Pool: ₱{calc.leadershipAmount.toFixed(2)}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* User Balance */}
            <div className="p-3 rounded-lg bg-muted/50 border text-sm">
              <p>Your balance: <strong>₱{userCredits.toLocaleString()}</strong></p>
              {selectedTier !== null && calculateUpgrade(selectedTier) && 
               userCredits < (calculateUpgrade(selectedTier)?.upgradeAmount || 0) && (
                <p className="text-destructive mt-1">
                  Insufficient credits. You need ₱{((calculateUpgrade(selectedTier)?.upgradeAmount || 0) - userCredits).toLocaleString()} more.
                </p>
              )}
            </div>

            {/* Upgrade Button */}
            <div className="flex items-center justify-end pt-4 border-t">
              <Button
                onClick={handleUpgrade}
                disabled={
                  selectedTier === null || 
                  upgrading || 
                  (selectedTier !== null && userCredits < (calculateUpgrade(selectedTier)?.upgradeAmount || 0))
                }
                className="gap-2"
              >
                {upgrading && <Loader2 className="h-4 w-4 animate-spin" />}
                {selectedTier !== null
                  ? `Upgrade to ${tiers[selectedTier]?.name}`
                  : 'Select a Tier'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}