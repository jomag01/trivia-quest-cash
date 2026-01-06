import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Crown, 
  Calendar, 
  Hexagon,
  DollarSign,
  Sparkles,
  TrendingUp,
  GitBranch
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface BeehiveTier {
  id: string;
  tier_name: string;
  plan_type: 'monthly' | 'biannual' | 'yearly';
  price: number;
  credits_included: number;
  binary_volume: number;
  daily_cap: number;
  cycle_volume: number;
  cycle_commission_percent: number;
  left_volume_required: number;
  right_volume_required: number;
  is_active: boolean;
  display_order: number;
}

interface VolumeRule {
  id: string;
  tier_id: string;
  rule_name: string;
  left_volume_min: number;
  right_volume_min: number;
  commission_multiplier: number;
  max_daily_cycles: number | null;
  is_active: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  biannual: '6-Month',
  yearly: 'Yearly'
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  monthly: <Calendar className="h-4 w-4 text-blue-500" />,
  biannual: <Hexagon className="h-4 w-4 text-purple-500" />,
  yearly: <Crown className="h-4 w-4 text-yellow-500" />
};

export default function BeehiveTierManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [tiers, setTiers] = useState<BeehiveTier[]>([]);
  const [volumeRules, setVolumeRules] = useState<VolumeRule[]>([]);
  const [showAddTier, setShowAddTier] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  
  const [newTier, setNewTier] = useState<Partial<BeehiveTier>>({
    tier_name: '',
    plan_type: 'monthly',
    price: 0,
    credits_included: 0,
    binary_volume: 0,
    daily_cap: 5000,
    cycle_volume: 11960,
    cycle_commission_percent: 10,
    left_volume_required: 11960,
    right_volume_required: 11960,
    is_active: true
  });

  const [newRule, setNewRule] = useState<Partial<VolumeRule>>({
    rule_name: '',
    left_volume_min: 0,
    right_volume_min: 0,
    commission_multiplier: 1,
    max_daily_cycles: null,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, rulesRes] = await Promise.all([
        supabase.from('beehive_tiers').select('*').order('display_order'),
        supabase.from('beehive_volume_rules').select('*').order('created_at')
      ]);

      if (tiersRes.data) setTiers(tiersRes.data as BeehiveTier[]);
      if (rulesRes.data) setVolumeRules(rulesRes.data as VolumeRule[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = async () => {
    if (!newTier.tier_name) {
      toast.error('Please enter a tier name');
      return;
    }

    setSaving('add');
    try {
      const { error } = await supabase.from('beehive_tiers').insert([{
        tier_name: newTier.tier_name,
        plan_type: newTier.plan_type,
        price: newTier.price,
        credits_included: newTier.credits_included,
        binary_volume: newTier.binary_volume,
        daily_cap: newTier.daily_cap,
        cycle_volume: newTier.cycle_volume,
        cycle_commission_percent: newTier.cycle_commission_percent,
        left_volume_required: newTier.left_volume_required,
        right_volume_required: newTier.right_volume_required,
        is_active: newTier.is_active,
        display_order: tiers.length + 1
      }]);

      if (error) throw error;

      toast.success('Tier added successfully');
      setShowAddTier(false);
      setNewTier({
        tier_name: '',
        plan_type: 'monthly',
        price: 0,
        credits_included: 0,
        binary_volume: 0,
        daily_cap: 5000,
        cycle_volume: 11960,
        cycle_commission_percent: 10,
        left_volume_required: 11960,
        right_volume_required: 11960,
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error adding tier:', error);
      toast.error('Failed to add tier');
    } finally {
      setSaving(null);
    }
  };

  const handleUpdateTier = async (tier: BeehiveTier) => {
    setSaving(tier.id);
    try {
      const { error } = await supabase
        .from('beehive_tiers')
        .update({
          tier_name: tier.tier_name,
          plan_type: tier.plan_type,
          price: tier.price,
          credits_included: tier.credits_included,
          binary_volume: tier.binary_volume,
          daily_cap: tier.daily_cap,
          cycle_volume: tier.cycle_volume,
          cycle_commission_percent: tier.cycle_commission_percent,
          left_volume_required: tier.left_volume_required,
          right_volume_required: tier.right_volume_required,
          is_active: tier.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', tier.id);

      if (error) throw error;
      toast.success('Tier updated');
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error('Failed to update tier');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!confirm('Delete this tier?')) return;

    try {
      const { error } = await supabase.from('beehive_tiers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tier deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting tier:', error);
      toast.error('Failed to delete tier');
    }
  };

  const handleAddVolumeRule = async () => {
    if (!selectedTierId || !newRule.rule_name) {
      toast.error('Please select a tier and enter a rule name');
      return;
    }

    setSaving('addRule');
    try {
      const { error } = await supabase.from('beehive_volume_rules').insert([{
        tier_id: selectedTierId,
        rule_name: newRule.rule_name,
        left_volume_min: newRule.left_volume_min,
        right_volume_min: newRule.right_volume_min,
        commission_multiplier: newRule.commission_multiplier,
        max_daily_cycles: newRule.max_daily_cycles,
        is_active: newRule.is_active
      }]);

      if (error) throw error;

      toast.success('Volume rule added');
      setShowAddRule(false);
      setNewRule({
        rule_name: '',
        left_volume_min: 0,
        right_volume_min: 0,
        commission_multiplier: 1,
        max_daily_cycles: null,
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error adding rule:', error);
      toast.error('Failed to add rule');
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const { error } = await supabase.from('beehive_volume_rules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const updateTierField = (id: string, field: keyof BeehiveTier, value: any) => {
    setTiers(prev => prev.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

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
      {/* Tier Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hexagon className="h-5 w-5 text-primary" />
                AI Beehives Tiers
              </CardTitle>
              <CardDescription>
                Manage subscription tiers for Monthly, 6-Month, and Yearly plans
              </CardDescription>
            </div>
            <Dialog open={showAddTier} onOpenChange={setShowAddTier}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Tier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tier Name</Label>
                      <Input
                        value={newTier.tier_name}
                        onChange={e => setNewTier(p => ({ ...p, tier_name: e.target.value }))}
                        placeholder="e.g., Premium Monthly"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plan Type</Label>
                      <Select
                        value={newTier.plan_type}
                        onValueChange={v => setNewTier(p => ({ ...p, plan_type: v as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="biannual">6-Month</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Price (₱)</Label>
                      <Input
                        type="number"
                        value={newTier.price}
                        onChange={e => setNewTier(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Credits</Label>
                      <Input
                        type="number"
                        value={newTier.credits_included}
                        onChange={e => setNewTier(p => ({ ...p, credits_included: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Binary Volume</Label>
                      <Input
                        type="number"
                        value={newTier.binary_volume}
                        onChange={e => setNewTier(p => ({ ...p, binary_volume: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Daily Cap (₱)</Label>
                      <Input
                        type="number"
                        value={newTier.daily_cap}
                        onChange={e => setNewTier(p => ({ ...p, daily_cap: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cycle Commission %</Label>
                      <Input
                        type="number"
                        value={newTier.cycle_commission_percent}
                        onChange={e => setNewTier(p => ({ ...p, cycle_commission_percent: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Left Volume Required</Label>
                      <Input
                        type="number"
                        value={newTier.left_volume_required}
                        onChange={e => setNewTier(p => ({ ...p, left_volume_required: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Right Volume Required</Label>
                      <Input
                        type="number"
                        value={newTier.right_volume_required}
                        onChange={e => setNewTier(p => ({ ...p, right_volume_required: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddTier} disabled={saving === 'add'} className="w-full">
                    {saving === 'add' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Tier
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.map(tier => (
            <div 
              key={tier.id} 
              className={`p-4 border rounded-lg space-y-4 ${
                tier.plan_type === 'yearly' 
                  ? 'bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border-yellow-500/20'
                  : tier.plan_type === 'biannual'
                  ? 'bg-gradient-to-br from-purple-500/5 to-pink-500/5 border-purple-500/20'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {PLAN_ICONS[tier.plan_type]}
                  <span className="font-medium">{tier.tier_name}</span>
                  <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                    {PLAN_LABELS[tier.plan_type]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tier.is_active}
                    onCheckedChange={v => updateTierField(tier.id, 'is_active', v)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateTier(tier)}
                    disabled={saving === tier.id}
                  >
                    {saving === tier.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteTier(tier.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Price (₱)
                  </Label>
                  <Input
                    type="number"
                    value={tier.price}
                    onChange={e => updateTierField(tier.id, 'price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Credits
                  </Label>
                  <Input
                    type="number"
                    value={tier.credits_included}
                    onChange={e => updateTierField(tier.id, 'credits_included', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Binary Volume
                  </Label>
                  <Input
                    type="number"
                    value={tier.binary_volume}
                    onChange={e => updateTierField(tier.id, 'binary_volume', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Daily Cap (₱)</Label>
                  <Input
                    type="number"
                    value={tier.daily_cap}
                    onChange={e => updateTierField(tier.id, 'daily_cap', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cycle Volume</Label>
                  <Input
                    type="number"
                    value={tier.cycle_volume}
                    onChange={e => updateTierField(tier.id, 'cycle_volume', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Commission %</Label>
                  <Input
                    type="number"
                    value={tier.cycle_commission_percent}
                    onChange={e => updateTierField(tier.id, 'cycle_commission_percent', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <GitBranch className="h-3 w-3 text-blue-500" />
                    Left Vol Required
                  </Label>
                  <Input
                    type="number"
                    value={tier.left_volume_required}
                    onChange={e => updateTierField(tier.id, 'left_volume_required', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <GitBranch className="h-3 w-3 text-green-500 rotate-180" />
                    Right Vol Required
                  </Label>
                  <Input
                    type="number"
                    value={tier.right_volume_required}
                    onChange={e => updateTierField(tier.id, 'right_volume_required', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Volume Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                Volume Rules Creator
              </CardTitle>
              <CardDescription>
                Create custom volume requirements and commission multipliers per tier
              </CardDescription>
            </div>
            <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Volume Rule</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Tier</Label>
                    <Select value={selectedTierId || ''} onValueChange={setSelectedTierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map(t => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.tier_name} ({PLAN_LABELS[t.plan_type]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input
                      value={newRule.rule_name}
                      onChange={e => setNewRule(p => ({ ...p, rule_name: e.target.value }))}
                      placeholder="e.g., Double Cycle Bonus"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Left Volume Min</Label>
                      <Input
                        type="number"
                        value={newRule.left_volume_min}
                        onChange={e => setNewRule(p => ({ ...p, left_volume_min: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Right Volume Min</Label>
                      <Input
                        type="number"
                        value={newRule.right_volume_min}
                        onChange={e => setNewRule(p => ({ ...p, right_volume_min: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Commission Multiplier</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newRule.commission_multiplier}
                        onChange={e => setNewRule(p => ({ ...p, commission_multiplier: parseFloat(e.target.value) || 1 }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Daily Cycles</Label>
                      <Input
                        type="number"
                        value={newRule.max_daily_cycles || ''}
                        onChange={e => setNewRule(p => ({ ...p, max_daily_cycles: parseInt(e.target.value) || null }))}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddVolumeRule} disabled={saving === 'addRule'} className="w-full">
                    {saving === 'addRule' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add Rule
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {volumeRules.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No volume rules created. Add rules to customize volume requirements per tier.
            </p>
          ) : (
            <div className="space-y-3">
              {tiers.map(tier => {
                const tierRules = volumeRules.filter(r => r.tier_id === tier.id);
                if (tierRules.length === 0) return null;

                return (
                  <div key={tier.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {PLAN_ICONS[tier.plan_type]}
                      <span className="font-medium text-sm">{tier.tier_name}</span>
                    </div>
                    {tierRules.map(rule => (
                      <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium text-sm">{rule.rule_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Left: ₱{rule.left_volume_min.toLocaleString()} | Right: ₱{rule.right_volume_min.toLocaleString()} | 
                            Multiplier: {rule.commission_multiplier}x | 
                            Max Cycles: {rule.max_daily_cycles || 'Unlimited'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteRule(rule.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
