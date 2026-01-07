import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Crown, Settings, Users, TrendingUp, Edit2, Plus, 
  Save, Trash2, Eye, Heart, Wand2, Store, ArrowUpCircle, ShieldCheck
} from "lucide-react";

interface PremiumTier {
  id: string;
  tier_name: string;
  tier_key: string;
  duration_days: number;
  price_php: number;
  visibility_multiplier: number;
  daily_likes: number | null;
  features: string[];
  ai_enhancement_mode: string;
  ai_free_enhancements_per_month: number;
  can_showcase_shop: boolean;
  can_join_rewards_program: boolean;
  display_order: number;
  is_active: boolean;
  upgrade_tier_id: string | null;
  is_graduation_tier: boolean;
}

interface ActivitySetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
}

export function BeesMatePremiumManagement() {
  const [tiers, setTiers] = useState<PremiumTier[]>([]);
  const [activitySettings, setActivitySettings] = useState<ActivitySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<PremiumTier | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stats, setStats] = useState({ totalSubscribers: 0, activeSubscribers: 0, revenue: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, settingsRes, subsRes] = await Promise.all([
        supabase.from('beesmate_premium_tiers').select('*').order('display_order'),
        supabase.from('beesmate_activity_settings').select('*'),
        supabase.from('beesmate_subscriptions').select('id, status, tier_id')
      ]);

      if (tiersRes.data) {
        setTiers(tiersRes.data.map(t => ({
          ...t,
          features: Array.isArray(t.features) ? t.features as string[] : []
        })));
      }
      
      if (settingsRes.data) {
        setActivitySettings(settingsRes.data);
      }

      if (subsRes.data) {
        const active = subsRes.data.filter(s => s.status === 'active').length;
        setStats({
          totalSubscribers: subsRes.data.length,
          activeSubscribers: active,
          revenue: 0 // Would calculate from payments
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveTier = async () => {
    if (!editingTier) return;
    
    try {
      const { error } = await supabase
        .from('beesmate_premium_tiers')
        .upsert({
          ...editingTier,
          features: editingTier.features,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success('Tier saved!');
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Failed to save tier');
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await supabase
        .from('beesmate_activity_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);
      
      setActivitySettings(prev => prev.map(s => 
        s.setting_key === key ? { ...s, setting_value: value } : s
      ));
      toast.success('Setting updated');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update');
    }
  };

  const toggleTierActive = async (tier: PremiumTier) => {
    try {
      await supabase
        .from('beesmate_premium_tiers')
        .update({ is_active: !tier.is_active })
        .eq('id', tier.id);
      
      setTiers(prev => prev.map(t => 
        t.id === tier.id ? { ...t, is_active: !t.is_active } : t
      ));
      toast.success(`Tier ${!tier.is_active ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.totalSubscribers}</p>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeSubscribers}</p>
                <p className="text-sm text-muted-foreground">Active Subscribers</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">₱{stats.revenue.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <Crown className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiers">
        <TabsList>
          <TabsTrigger value="tiers">Premium Tiers</TabsTrigger>
          <TabsTrigger value="activity">Activity Requirements</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          {tiers.map((tier) => (
            <Card key={tier.id} className={!tier.is_active ? 'opacity-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${tier.tier_key === 'pro' ? 'bg-rose-500' : tier.tier_key === 'boost' ? 'bg-amber-500' : 'bg-gray-400'} text-white`}>
                      <Crown className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{tier.tier_name}</h3>
                        <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                          {tier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₱{tier.price_php} / {tier.duration_days} days
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tier.is_active}
                      onCheckedChange={() => toggleTierActive(tier)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingTier(tier);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span>{tier.visibility_multiplier}x visibility</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-muted-foreground" />
                    <span>{tier.daily_likes ?? 'Unlimited'} likes/day</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-muted-foreground" />
                    <span>AI: {tier.ai_enhancement_mode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <span>Shop: {tier.can_showcase_shop ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activitySettings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between">
                  <div>
                    <Label>{setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  {setting.setting_key === 'monthly_subscription_required' ? (
                    <Switch
                      checked={setting.setting_value === 'true'}
                      onCheckedChange={(checked) => updateSetting(setting.setting_key, String(checked))}
                    />
                  ) : (
                    <Input
                      className="w-24"
                      value={setting.setting_value || ''}
                      onChange={(e) => updateSetting(setting.setting_key, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Tier Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Premium Tier</DialogTitle>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tier Name</Label>
                  <Input
                    value={editingTier.tier_name}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, tier_name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price (PHP)</Label>
                  <Input
                    type="number"
                    value={editingTier.price_php}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, price_php: Number(e.target.value) } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={editingTier.duration_days}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, duration_days: Number(e.target.value) } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibility Multiplier</Label>
                  <Input
                    type="number"
                    value={editingTier.visibility_multiplier}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, visibility_multiplier: Number(e.target.value) } : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>AI Enhancement Mode</Label>
                <Select
                  value={editingTier.ai_enhancement_mode}
                  onValueChange={(value) => setEditingTier(prev => prev ? { ...prev, ai_enhancement_mode: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credits">Use Credits</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                    <SelectItem value="limited_free">Limited Free + Credits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Can Showcase Shop</Label>
                <Switch
                  checked={editingTier.can_showcase_shop}
                  onCheckedChange={(checked) => setEditingTier(prev => prev ? { ...prev, can_showcase_shop: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Can Join Rewards Program</Label>
                <Switch
                  checked={editingTier.can_join_rewards_program}
                  onCheckedChange={(checked) => setEditingTier(prev => prev ? { ...prev, can_join_rewards_program: checked } : null)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Graduation Tier</Label>
                  <p className="text-xs text-muted-foreground">Users can upgrade to this tier when they graduate</p>
                </div>
                <Switch
                  checked={editingTier.is_graduation_tier || false}
                  onCheckedChange={(checked) => setEditingTier(prev => prev ? { ...prev, is_graduation_tier: checked } : null)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ArrowUpCircle className="w-4 h-4" />
                  Upgrade Path (for graduation)
                </Label>
                <Select
                  value={editingTier.upgrade_tier_id || 'none'}
                  onValueChange={(value) => setEditingTier(prev => prev ? { ...prev, upgrade_tier_id: value === 'none' ? null : value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select upgrade tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No upgrade path</SelectItem>
                    {tiers.filter(t => t.id !== editingTier.id).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.tier_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When a user graduates from this tier, they can upgrade to the selected tier
                </p>
              </div>

              <Button className="w-full" onClick={saveTier}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}