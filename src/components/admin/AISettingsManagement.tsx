import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, VideoIcon, ImageIcon, Save, DollarSign, Users, Crown, Loader2 } from 'lucide-react';

interface CreditTier {
  price: string;
  credits: string;
  images: string;
  videos: string;
  cost: string; // Admin's actual cost for this tier
}

const AISettingsManagement = () => {
  const [freeImageLimit, setFreeImageLimit] = useState('3');
  const [videoCreditCost, setVideoCreditCost] = useState('10');
  const [creditToDiamondRate, setCreditToDiamondRate] = useState('10'); // 10 credits = 1 diamond
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cost markup percentage
  const [costMarkupPercent, setCostMarkupPercent] = useState('100'); // 100% markup = 2x price

  // Credit tiers with cost
  const [tiers, setTiers] = useState<CreditTier[]>([
    { price: '100', credits: '50', images: '30', videos: '10', cost: '30' },
    { price: '250', credits: '150', images: '100', videos: '30', cost: '75' },
    { price: '500', credits: '400', images: '300', videos: '80', cost: '150' }
  ]);

  // Commission settings
  const [adminEarningsPercent, setAdminEarningsPercent] = useState('35');
  const [unilevelPercent, setUnilevelPercent] = useState('40');
  const [stairstepPercent, setStairstepPercent] = useState('35');
  const [leadershipPercent, setLeadershipPercent] = useState('25');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'ai_%');

      if (error) throw error;

      data?.forEach(setting => {
        if (setting.key === 'ai_free_image_limit') {
          setFreeImageLimit(setting.value || '3');
        } else if (setting.key === 'ai_video_credit_cost') {
          setVideoCreditCost(setting.value || '10');
        } else if (setting.key === 'ai_credit_to_diamond_rate') {
          setCreditToDiamondRate(setting.value || '10');
        } else if (setting.key === 'ai_admin_earnings_percent') {
          setAdminEarningsPercent(setting.value || '35');
        } else if (setting.key === 'ai_unilevel_percent') {
          setUnilevelPercent(setting.value || '40');
        } else if (setting.key === 'ai_stairstep_percent') {
          setStairstepPercent(setting.value || '35');
        } else if (setting.key === 'ai_leadership_percent') {
          setLeadershipPercent(setting.value || '25');
        }

        if (setting.key === 'ai_cost_markup_percent') {
          setCostMarkupPercent(setting.value || '100');
        }

        // Parse tier settings
        const match = setting.key.match(/ai_credit_tier_(\d)_(\w+)/);
        if (match) {
          const tierIndex = parseInt(match[1]) - 1;
          const field = match[2];
          if (tierIndex >= 0 && tierIndex < 3) {
            setTiers(prev => {
              const newTiers = [...prev];
              if (field === 'price') newTiers[tierIndex].price = setting.value || '0';
              if (field === 'credits') newTiers[tierIndex].credits = setting.value || '0';
              if (field === 'image') newTiers[tierIndex].images = setting.value || '0';
              if (field === 'video') newTiers[tierIndex].videos = setting.value || '0';
              if (field === 'cost') newTiers[tierIndex].cost = setting.value || '0';
              return newTiers;
            });
          }
        }
      });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'ai_free_image_limit', value: freeImageLimit },
        { key: 'ai_video_credit_cost', value: videoCreditCost },
        { key: 'ai_credit_to_diamond_rate', value: creditToDiamondRate },
        { key: 'ai_cost_markup_percent', value: costMarkupPercent },
        { key: 'ai_admin_earnings_percent', value: adminEarningsPercent },
        { key: 'ai_unilevel_percent', value: unilevelPercent },
        { key: 'ai_stairstep_percent', value: stairstepPercent },
        { key: 'ai_leadership_percent', value: leadershipPercent },
        // Tier 1
        { key: 'ai_credit_tier_1_price', value: tiers[0].price },
        { key: 'ai_credit_tier_1_credits', value: tiers[0].credits },
        { key: 'ai_credit_tier_1_image', value: tiers[0].images },
        { key: 'ai_credit_tier_1_video', value: tiers[0].videos },
        { key: 'ai_credit_tier_1_cost', value: tiers[0].cost },
        // Tier 2
        { key: 'ai_credit_tier_2_price', value: tiers[1].price },
        { key: 'ai_credit_tier_2_credits', value: tiers[1].credits },
        { key: 'ai_credit_tier_2_image', value: tiers[1].images },
        { key: 'ai_credit_tier_2_video', value: tiers[1].videos },
        { key: 'ai_credit_tier_2_cost', value: tiers[1].cost },
        // Tier 3
        { key: 'ai_credit_tier_3_price', value: tiers[2].price },
        { key: 'ai_credit_tier_3_credits', value: tiers[2].credits },
        { key: 'ai_credit_tier_3_image', value: tiers[2].images },
        { key: 'ai_credit_tier_3_video', value: tiers[2].videos },
        { key: 'ai_credit_tier_3_cost', value: tiers[2].cost },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  const updateTier = (index: number, field: keyof CreditTier, value: string) => {
    setTiers(prev => {
      const newTiers = [...prev];
      newTiers[index] = { ...newTiers[index], [field]: value };
      return newTiers;
    });
  };

  const totalCommissionPercent = parseFloat(unilevelPercent) + parseFloat(stairstepPercent) + parseFloat(leadershipPercent);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Hub Basic Settings
          </CardTitle>
          <CardDescription>
            Configure free limits and base credit costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Free Image Generations
              </Label>
              <Input
                type="number"
                min="0"
                value={freeImageLimit}
                onChange={(e) => setFreeImageLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Free images per user before credits required
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <VideoIcon className="h-4 w-4 text-purple-500" />
                Video Generation Cost (Credits)
              </Label>
              <Input
                type="number"
                min="1"
                value={videoCreditCost}
                onChange={(e) => setVideoCreditCost(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Credits required per video generation
              </p>
            </div>
          </div>

          {/* Credit to Diamond Exchange Rate */}
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                Credit to Diamond Exchange Rate
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={creditToDiamondRate}
                  onChange={(e) => setCreditToDiamondRate(e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">credits = 1 diamond</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set how many AI credits equal 1 diamond for conversion (e.g., {creditToDiamondRate} credits = 1 💎)
              </p>
            </div>
          </div>

          {/* Cost Markup Percentage */}
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Cost Markup Percentage
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  value={costMarkupPercent}
                  onChange={(e) => setCostMarkupPercent(e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">% markup on cost</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {costMarkupPercent}% markup means: If cost is ₱100, selling price is ₱{(100 * (1 + parseFloat(costMarkupPercent) / 100)).toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credit Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Credit Purchase Tiers
          </CardTitle>
          <CardDescription>
            Configure pricing tiers for credit purchases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {['Starter', 'Popular', 'Pro'].map((tierName, index) => {
            const cost = parseFloat(tiers[index].cost) || 0;
            const price = parseFloat(tiers[index].price) || 0;
            const profit = price - cost;
            const profitMargin = price > 0 ? ((profit / price) * 100).toFixed(1) : '0';
            
            return (
              <div key={index} className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  Tier {index + 1}: {tierName}
                  {index === 1 && <span className="text-xs text-primary">(Best Value)</span>}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-orange-600">Cost (₱)</Label>
                    <Input
                      type="number"
                      value={tiers[index].cost}
                      onChange={(e) => updateTier(index, 'cost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₱)</Label>
                    <Input
                      type="number"
                      value={tiers[index].price}
                      onChange={(e) => updateTier(index, 'price', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Credits</Label>
                    <Input
                      type="number"
                      value={tiers[index].credits}
                      onChange={(e) => updateTier(index, 'credits', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">~Images</Label>
                    <Input
                      type="number"
                      value={tiers[index].images}
                      onChange={(e) => updateTier(index, 'images', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">~Videos</Label>
                    <Input
                      type="number"
                      value={tiers[index].videos}
                      onChange={(e) => updateTier(index, 'videos', e.target.value)}
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Profit: <strong className="text-green-600">₱{profit.toLocaleString()}</strong></span>
                  <span>Margin: <strong className={profit > 0 ? 'text-green-600' : 'text-destructive'}>{profitMargin}%</strong></span>
                </div>
                {index < 2 && <Separator />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Affiliate Commission Distribution
          </CardTitle>
          <CardDescription>
            Configure how credit purchase revenue is distributed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Admin Earnings (%)
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={adminEarningsPercent}
              onChange={(e) => setAdminEarningsPercent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Percentage admin earns from each credit purchase
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-sm font-medium mb-4">
              Commission Pool Distribution (Remaining {100 - parseFloat(adminEarningsPercent)}% after admin earnings)
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Unilevel (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={unilevelPercent}
                  onChange={(e) => setUnilevelPercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Stair-Step (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={stairstepPercent}
                  onChange={(e) => setStairstepPercent(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Leadership (%)</Label>
                <Input
                  type="number"
                  min="0"
                  value={leadershipPercent}
                  onChange={(e) => setLeadershipPercent(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {totalCommissionPercent}% (distributed proportionally from affiliate pool)
            </p>
          </div>

          {/* Cost-Based Commission Example */}
          <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="font-semibold text-primary text-sm mb-1">💡 Profitability Protection</p>
              <p className="text-xs text-muted-foreground">
                Commissions are calculated on <strong>PROFIT ONLY</strong> (Sale Price - Cost), not total sale amount.
                This ensures admin never loses money on commissions.
              </p>
            </div>
            
            <h4 className="font-medium text-sm">Example: Tier 2 (₱{tiers[1].price}) Purchase</h4>
            <div className="space-y-3 text-xs">
              <div className="grid gap-1">
                <p>• Your Cost: <strong className="text-orange-600">₱{tiers[1].cost}</strong></p>
                <p>• Sale Price: <strong>₱{tiers[1].price}</strong></p>
                <p>• Gross Profit: <strong className="text-green-600">₱{(parseFloat(tiers[1].price) - parseFloat(tiers[1].cost)).toLocaleString()}</strong></p>
              </div>
              
              <div className="border-t pt-2">
                <p className="font-medium mb-1">Commission Distribution (from ₱{(parseFloat(tiers[1].price) - parseFloat(tiers[1].cost)).toLocaleString()} profit):</p>
                {(() => {
                  const profit = parseFloat(tiers[1].price) - parseFloat(tiers[1].cost);
                  const adminShare = profit * parseFloat(adminEarningsPercent) / 100;
                  const affiliatePool = profit - adminShare;
                  const totalRatio = parseFloat(unilevelPercent) + parseFloat(stairstepPercent) + parseFloat(leadershipPercent);
                  const unilevelShare = affiliatePool * (parseFloat(unilevelPercent) / totalRatio);
                  const stairstepShare = affiliatePool * (parseFloat(stairstepPercent) / totalRatio);
                  const leadershipShare = affiliatePool * (parseFloat(leadershipPercent) / totalRatio);
                  
                  return (
                    <div className="ml-2 space-y-1">
                      <p>• Admin Earnings ({adminEarningsPercent}%): <strong className="text-green-600">₱{adminShare.toFixed(2)}</strong></p>
                      <p>• Affiliate Pool: <strong>₱{affiliatePool.toFixed(2)}</strong></p>
                      <div className="ml-4 text-muted-foreground">
                        <p>→ Unilevel ({unilevelPercent}%): ₱{unilevelShare.toFixed(2)}</p>
                        <p>→ Stair-Step ({stairstepPercent}%): ₱{stairstepShare.toFixed(2)}</p>
                        <p>→ Leadership ({leadershipPercent}%): ₱{leadershipShare.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save All Settings'}
      </Button>
    </div>
  );
};

export default AISettingsManagement;
