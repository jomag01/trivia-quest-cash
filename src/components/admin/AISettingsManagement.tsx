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
}

const AISettingsManagement = () => {
  const [freeImageLimit, setFreeImageLimit] = useState('3');
  const [videoCreditCost, setVideoCreditCost] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Credit tiers
  const [tiers, setTiers] = useState<CreditTier[]>([
    { price: '100', credits: '50', images: '30', videos: '10' },
    { price: '250', credits: '150', images: '100', videos: '30' },
    { price: '500', credits: '400', images: '300', videos: '80' }
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
        } else if (setting.key === 'ai_admin_earnings_percent') {
          setAdminEarningsPercent(setting.value || '35');
        } else if (setting.key === 'ai_unilevel_percent') {
          setUnilevelPercent(setting.value || '40');
        } else if (setting.key === 'ai_stairstep_percent') {
          setStairstepPercent(setting.value || '35');
        } else if (setting.key === 'ai_leadership_percent') {
          setLeadershipPercent(setting.value || '25');
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
        { key: 'ai_admin_earnings_percent', value: adminEarningsPercent },
        { key: 'ai_unilevel_percent', value: unilevelPercent },
        { key: 'ai_stairstep_percent', value: stairstepPercent },
        { key: 'ai_leadership_percent', value: leadershipPercent },
        // Tier 1
        { key: 'ai_credit_tier_1_price', value: tiers[0].price },
        { key: 'ai_credit_tier_1_credits', value: tiers[0].credits },
        { key: 'ai_credit_tier_1_image', value: tiers[0].images },
        { key: 'ai_credit_tier_1_video', value: tiers[0].videos },
        // Tier 2
        { key: 'ai_credit_tier_2_price', value: tiers[1].price },
        { key: 'ai_credit_tier_2_credits', value: tiers[1].credits },
        { key: 'ai_credit_tier_2_image', value: tiers[1].images },
        { key: 'ai_credit_tier_2_video', value: tiers[1].videos },
        // Tier 3
        { key: 'ai_credit_tier_3_price', value: tiers[2].price },
        { key: 'ai_credit_tier_3_credits', value: tiers[2].credits },
        { key: 'ai_credit_tier_3_image', value: tiers[2].images },
        { key: 'ai_credit_tier_3_video', value: tiers[2].videos },
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
          {['Starter', 'Popular', 'Pro'].map((tierName, index) => (
            <div key={index} className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                Tier {index + 1}: {tierName}
                {index === 1 && <span className="text-xs text-primary">(Best Value)</span>}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              {index < 2 && <Separator />}
            </div>
          ))}
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

          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium text-sm mb-2">Example Calculation:</h4>
            <p className="text-xs text-muted-foreground">
              For a ₱{tiers[1].price} purchase: Admin earns ₱{(parseFloat(tiers[1].price) * parseFloat(adminEarningsPercent) / 100).toFixed(2)}, 
              Affiliate pool: ₱{(parseFloat(tiers[1].price) * (100 - parseFloat(adminEarningsPercent)) / 100).toFixed(2)} 
              (distributed across Unilevel, Stair-Step, Leadership based on ratios)
            </p>
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
