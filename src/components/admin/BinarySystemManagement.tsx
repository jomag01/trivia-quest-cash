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
  GitBranch, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Shield,
  RefreshCw,
  Loader2,
  Save,
  Calculator,
  Percent,
  Clock,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Sparkles
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BinaryMember {
  id: string;
  user_id: string;
  left_volume: number;
  right_volume: number;
  total_cycles: number;
  joined_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface CreditTier {
  name: string;
  price: number;
  credits: number;
  images: number;
  videos: number;
  cost: number;
}

export default function BinarySystemManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [members, setMembers] = useState<BinaryMember[]>([]);
  const [creditTiers, setCreditTiers] = useState<CreditTier[]>([]);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalVolume: 0,
    totalCycles: 0,
    totalPaid: 0
  });

  // Settings state
  const [settings, setSettings] = useState({
    joinAmount: 500,
    cycleVolume: 1000,
    cycleCommission: 100,
    dailyCap: 5000,
    adminSafetyNet: 35,
    autoReplenishEnabled: true,
    autoReplenishPercent: 20,
    unilevelDeductPercent: 20,
    stairstepDeductPercent: 20,
    leadershipDeductPercent: 20,
    selectedTierIndex: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .or('key.like.binary_%,key.like.ai_credit_tier_%,key.eq.ai_tier_count');

      // Parse AI credit tiers
      const tierCountSetting = settingsData?.find(s => s.key === 'ai_tier_count');
      const tierCount = tierCountSetting ? parseInt(tierCountSetting.value || '3') : 3;
      
      const loadedTiers: CreditTier[] = [];
      for (let i = 0; i < tierCount; i++) {
        loadedTiers.push({
          name: `Tier ${i + 1}`,
          price: 0,
          credits: 0,
          images: 0,
          videos: 0,
          cost: 0
        });
      }

      if (settingsData) {
        const newSettings = { ...settings };
        settingsData.forEach(s => {
          if (s.key === 'binary_join_amount') newSettings.joinAmount = parseFloat(s.value || '500');
          if (s.key === 'binary_cycle_volume') newSettings.cycleVolume = parseFloat(s.value || '1000');
          if (s.key === 'binary_cycle_commission') newSettings.cycleCommission = parseFloat(s.value || '100');
          if (s.key === 'binary_daily_cap') newSettings.dailyCap = parseFloat(s.value || '5000');
          if (s.key === 'binary_admin_safety_net') newSettings.adminSafetyNet = parseFloat(s.value || '35');
          if (s.key === 'binary_auto_replenish_enabled') newSettings.autoReplenishEnabled = s.value === 'true';
          if (s.key === 'binary_auto_replenish_percent') newSettings.autoReplenishPercent = parseFloat(s.value || '20');
          if (s.key === 'binary_unilevel_deduct_percent') newSettings.unilevelDeductPercent = parseFloat(s.value || '20');
          if (s.key === 'binary_stairstep_deduct_percent') newSettings.stairstepDeductPercent = parseFloat(s.value || '20');
          if (s.key === 'binary_leadership_deduct_percent') newSettings.leadershipDeductPercent = parseFloat(s.value || '20');
          if (s.key === 'binary_selected_tier_index') newSettings.selectedTierIndex = parseInt(s.value || '0');

          // Parse tier settings
          const match = s.key.match(/ai_credit_tier_(\d+)_(\w+)/);
          if (match) {
            const tierIndex = parseInt(match[1]) - 1;
            const field = match[2];
            if (tierIndex >= 0 && tierIndex < loadedTiers.length) {
              if (field === 'name') loadedTiers[tierIndex].name = s.value || `Tier ${tierIndex + 1}`;
              if (field === 'price') loadedTiers[tierIndex].price = parseFloat(s.value || '0');
              if (field === 'credits') loadedTiers[tierIndex].credits = parseFloat(s.value || '0');
              if (field === 'image') loadedTiers[tierIndex].images = parseFloat(s.value || '0');
              if (field === 'video') loadedTiers[tierIndex].videos = parseFloat(s.value || '0');
              if (field === 'cost') loadedTiers[tierIndex].cost = parseFloat(s.value || '0');
            }
          }
        });
        setSettings(newSettings);
      }

      if (loadedTiers.length > 0 && loadedTiers.some(t => t.price > 0)) {
        setCreditTiers(loadedTiers);
      }

      // Fetch binary members
      const { data: membersData } = await supabase
        .from('binary_network')
        .select('*')
        .order('joined_at', { ascending: false })
        .limit(50);

      if (membersData) {
        // Fetch profile data for each member
        const memberIds = membersData.map(m => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', memberIds);

        const profileMap = new Map(profilesData?.map(p => [p.id, { full_name: p.full_name, email: p.email }]) || []);
        
        const membersWithProfiles = membersData.map(m => ({
          ...m,
          profiles: profileMap.get(m.user_id) || { full_name: 'Unknown', email: '' }
        }));

        setMembers(membersWithProfiles as BinaryMember[]);
        
        // Calculate stats
        const totalVolume = membersData.reduce((sum, m) => sum + Number(m.left_volume || 0) + Number(m.right_volume || 0), 0);
        const totalCycles = membersData.reduce((sum, m) => sum + Number(m.total_cycles || 0), 0);
        setStats({
          totalMembers: membersData.length,
          totalVolume,
          totalCycles,
          totalPaid: totalCycles * settings.cycleCommission
        });
      }

      // Get total paid from commissions
      const { data: commissionsData } = await supabase
        .from('binary_commissions')
        .select('amount');

      if (commissionsData) {
        const totalPaid = commissionsData.reduce((sum, c) => sum + Number(c.amount), 0);
        setStats(prev => ({ ...prev, totalPaid }));
      }

    } catch (error) {
      console.error('Error fetching binary data:', error);
      toast.error('Failed to load binary system data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSection = async (section: string, settingsToSave: { key: string; value: string }[]) => {
    setSaving(section);
    try {
      for (const setting of settingsToSave) {
        await supabase
          .from('app_settings')
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
      }
      toast.success(`${section} settings saved!`);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const saveBasicSettings = () => handleSaveSection('Basic', [
    { key: 'binary_join_amount', value: settings.joinAmount.toString() },
    { key: 'binary_cycle_volume', value: settings.cycleVolume.toString() },
    { key: 'binary_cycle_commission', value: settings.cycleCommission.toString() },
    { key: 'binary_daily_cap', value: settings.dailyCap.toString() }
  ]);

  const saveTierSettings = () => handleSaveSection('Tier', [
    { key: 'binary_selected_tier_index', value: settings.selectedTierIndex.toString() }
  ]);

  const saveSafetySettings = () => handleSaveSection('Safety Net', [
    { key: 'binary_admin_safety_net', value: settings.adminSafetyNet.toString() }
  ]);

  const saveAutoReplenishSettings = () => handleSaveSection('Auto-Replenish', [
    { key: 'binary_auto_replenish_enabled', value: settings.autoReplenishEnabled.toString() },
    { key: 'binary_auto_replenish_percent', value: settings.autoReplenishPercent.toString() },
    { key: 'binary_unilevel_deduct_percent', value: settings.unilevelDeductPercent.toString() },
    { key: 'binary_stairstep_deduct_percent', value: settings.stairstepDeductPercent.toString() },
    { key: 'binary_leadership_deduct_percent', value: settings.leadershipDeductPercent.toString() }
  ]);

  // Get selected tier info
  const selectedTier = creditTiers[settings.selectedTierIndex] || { name: 'N/A', price: 0, credits: 0, cost: 0, images: 0, videos: 0 };

  // Profitability Calculator
  const calculateProfitability = () => {
    const purchaseAmount = selectedTier.price || settings.joinAmount;
    const aiCost = selectedTier.cost || 0;
    const adminSafetyNetPercent = settings.adminSafetyNet;
    const cycleCommission = settings.cycleCommission;
    const cycleVolume = settings.cycleVolume;
    const dailyCap = settings.dailyCap;

    // Admin keeps from purchase (safety net)
    const adminKeeps = (purchaseAmount * adminSafetyNetPercent) / 100;
    
    // After deducting AI cost
    const grossProfit = purchaseAmount - aiCost;
    const netAdminProfit = adminKeeps - aiCost;
    
    // Affiliate pool (what's left for commissions)
    const affiliatePool = purchaseAmount - adminKeeps;
    
    // Calculate max cycles possible from affiliate pool
    const maxCyclesFromPool = cycleCommission > 0 ? Math.floor(affiliatePool / cycleCommission) : 0;
    
    // Max cycles per day per user (based on daily cap)
    const maxCyclesPerDayPerUser = cycleCommission > 0 ? Math.floor(dailyCap / cycleCommission) : 0;
    
    // Total possible cycles from one purchase (volume / cycle volume)
    const cyclesPerPurchase = cycleVolume > 0 ? Math.floor(purchaseAmount / cycleVolume) : 0;
    
    // Overpay threshold - when payout exceeds affiliate pool
    const overpayThreshold = affiliatePool;
    const maxSafePayout = affiliatePool;
    
    // Break-even analysis
    const breakEvenCycles = cycleCommission > 0 ? Math.ceil(aiCost / cycleCommission) : 0;
    
    // Is the current setup profitable?
    const isProfitable = netAdminProfit > 0 && affiliatePool >= cycleCommission;
    const profitPerCycle = adminKeeps - aiCost;
    
    return {
      purchaseAmount,
      aiCost,
      grossProfit,
      adminKeeps,
      netAdminProfit,
      affiliatePool,
      cycleCommission,
      maxCyclesFromPool,
      maxCyclesPerDayPerUser,
      cyclesPerPurchase,
      overpayThreshold,
      maxSafePayout,
      breakEvenCycles,
      isProfitable,
      profitPerCycle,
      credits: selectedTier.credits,
      images: selectedTier.images,
      videos: selectedTier.videos
    };
  };

  const profitCalc = calculateProfitability();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  

  return (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-6 p-1">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalMembers}</p>
                  <p className="text-xs text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">₱{stats.totalVolume.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Volume</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalCycles}</p>
                  <p className="text-xs text-muted-foreground">Total Cycles</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">₱{stats.totalPaid.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Paid Out</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              AI Affiliate System Settings
            </CardTitle>
            <CardDescription>
              Configure the AI affiliate system for AI credits. This system is <span className="font-semibold">separate</span> from unilevel, stair-step, and leadership commissions which apply to shop product purchases only.
            </CardDescription>
          </CardHeader>

          {/* Important Notice */}
          <CardContent className="pt-0 pb-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">⚠️ Commission System Separation:</p>
              <p className="text-muted-foreground text-xs">
                • <span className="font-medium">AI Affiliate System:</span> Commissions from AI credit package purchases only<br/>
                • <span className="font-medium">Unilevel/Stair-Step/Leadership:</span> Commissions from shop product purchases only<br/>
                • Users are enrolled in ALL systems via referral, but AI affiliate activates only when they buy AI credits
              </p>
            </div>
          </CardContent>
          <CardContent className="space-y-6">
            {/* Basic Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="joinAmount">Minimum Join Amount (₱)</Label>
                <Input
                  id="joinAmount"
                  type="number"
                  value={settings.joinAmount}
                  onChange={(e) => setSettings({ ...settings, joinAmount: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Min AI credits purchase to join</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycleVolume">Cycle Volume (₱)</Label>
                <Input
                  id="cycleVolume"
                  type="number"
                  value={settings.cycleVolume}
                  onChange={(e) => setSettings({ ...settings, cycleVolume: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Volume needed per leg for cycle</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cycleCommission">Cycle Commission (₱)</Label>
                <Input
                  id="cycleCommission"
                  type="number"
                  value={settings.cycleCommission}
                  onChange={(e) => setSettings({ ...settings, cycleCommission: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Earnings per completed cycle</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyCap">Daily Earning Cap (₱)</Label>
                <Input
                  id="dailyCap"
                  type="number"
                  value={settings.dailyCap}
                  onChange={(e) => setSettings({ ...settings, dailyCap: parseFloat(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Max daily earnings per user</p>
              </div>
            </div>
            <Button onClick={saveBasicSettings} disabled={saving === 'Basic'} size="sm" className="gap-2 mt-2">
              {saving === 'Basic' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Basic Settings
            </Button>

            <Separator />

            {/* AI Credit Tier Integration */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Link to AI Credit Tier
              </h4>
              <p className="text-xs text-muted-foreground">
                Select which AI credit tier package users receive when purchasing through the binary system. Credits will be automatically added to their account.
              </p>
              {creditTiers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select AI Credit Tier</Label>
                    <Select
                      value={settings.selectedTierIndex.toString()}
                      onValueChange={(val) => setSettings({ ...settings, selectedTierIndex: parseInt(val), joinAmount: creditTiers[parseInt(val)]?.price || settings.joinAmount })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {creditTiers.map((tier, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {tier.name} - ₱{tier.price.toLocaleString()} ({tier.credits} credits)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium mb-2 text-primary">Selected Tier Benefits:</p>
                    <div className="space-y-1 text-xs">
                      <p>💰 Price: <strong>₱{selectedTier.price.toLocaleString()}</strong></p>
                      <p>🎯 Credits: <strong>{selectedTier.credits}</strong></p>
                      <p>🖼️ ~Images: <strong>{selectedTier.images}</strong></p>
                      <p>🎬 ~Videos: <strong>{selectedTier.videos}</strong></p>
                      <p className="text-orange-600">📊 Cost: <strong>₱{selectedTier.cost.toLocaleString()}</strong></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                  <p className="text-amber-700 dark:text-amber-400">⚠️ No AI credit tiers configured. Please set up tiers in AI Hub Settings first.</p>
                </div>
              )}
              <Button onClick={saveTierSettings} disabled={saving === 'Tier'} size="sm" className="gap-2">
                {saving === 'Tier' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Tier Selection
              </Button>
            </div>

            <Separator />

            {/* Admin Safety Net */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Safety Net
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminSafetyNet">Admin Retention (%)</Label>
                  <Input
                    id="adminSafetyNet"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.adminSafetyNet}
                    onChange={(e) => setSettings({ ...settings, adminSafetyNet: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Percentage admin keeps from each purchase</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm font-medium mb-2">Quick Calculation:</p>
                  <div className="space-y-1 text-xs">
                    <p>Purchase: ₱{profitCalc.purchaseAmount.toLocaleString()}</p>
                    <p>Admin keeps ({settings.adminSafetyNet}%): <span className="text-green-500">₱{profitCalc.adminKeeps.toFixed(2)}</span></p>
                    <p>Affiliate pool: ₱{profitCalc.affiliatePool.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <Button onClick={saveSafetySettings} disabled={saving === 'Safety Net'} size="sm" className="gap-2 mt-2">
                {saving === 'Safety Net' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Safety Net
              </Button>
            </div>

            <Separator />

            {/* Comprehensive Profitability Calculator */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Profitability Calculator
              </h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Per Cycle Computation */}
                <Card className={profitCalc.isProfitable ? 'border-green-500/50 bg-green-500/5' : 'border-destructive/50 bg-destructive/5'}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {profitCalc.isProfitable ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                      Per Cycle Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Purchase Amount</p>
                        <p className="font-bold">₱{profitCalc.purchaseAmount.toLocaleString()}</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">AI Cost (from tier)</p>
                        <p className="font-bold text-orange-600">₱{profitCalc.aiCost.toLocaleString()}</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Admin Keeps ({settings.adminSafetyNet}%)</p>
                        <p className="font-bold text-green-600">₱{profitCalc.adminKeeps.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Net Admin Profit</p>
                        <p className={`font-bold ${profitCalc.netAdminProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          ₱{profitCalc.netAdminProfit.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="p-2 rounded bg-primary/10 border border-primary/20">
                      <p className="text-muted-foreground">Affiliate Pool (for commissions)</p>
                      <p className="font-bold text-primary text-lg">₱{profitCalc.affiliatePool.toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Cycle Commission</p>
                        <p className="font-bold">₱{profitCalc.cycleCommission.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Max Cycles from Pool</p>
                        <p className="font-bold">{profitCalc.maxCyclesFromPool} cycles</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Overpay & Safety Thresholds */}
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Safety & Overpay Thresholds
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="p-3 rounded bg-background/50 border border-amber-500/30">
                      <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">⚠️ OVERPAY THRESHOLD</p>
                      <p className="text-muted-foreground">Max payout before losing money per purchase:</p>
                      <p className="font-bold text-2xl text-amber-600">₱{profitCalc.overpayThreshold.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        If total cycle payouts exceed this, admin loses money on this purchase.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Max Safe Payout/Purchase</p>
                        <p className="font-bold text-green-600">₱{profitCalc.maxSafePayout.toFixed(2)}</p>
                      </div>
                      <div className="p-2 rounded bg-background/50">
                        <p className="text-muted-foreground">Max Cycles/Day/User</p>
                        <p className="font-bold">{profitCalc.maxCyclesPerDayPerUser}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded bg-background/50">
                      <p className="text-muted-foreground">Daily Cap per User</p>
                      <p className="font-bold">₱{settings.dailyCap.toLocaleString()}</p>
                    </div>
                    <Separator />
                    <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
                      <p className="text-destructive font-medium">Break-Even Point</p>
                      <p className="text-xs text-muted-foreground">
                        After {profitCalc.breakEvenCycles} cycles paid, AI cost is covered.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Alert */}
              <div className={`p-4 rounded-lg border ${profitCalc.isProfitable ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                {profitCalc.isProfitable ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">Configuration is PROFITABLE</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        With current settings, admin earns <strong>₱{profitCalc.netAdminProfit.toFixed(2)}</strong> net profit per purchase after AI costs.
                        Affiliate pool of <strong>₱{profitCalc.affiliatePool.toFixed(2)}</strong> can fund up to <strong>{profitCalc.maxCyclesFromPool} cycles</strong> at ₱{settings.cycleCommission}/cycle.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Configuration may cause LOSSES</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Either increase admin retention %, reduce cycle commission, or select a tier with lower AI costs.
                        Current AI cost (₱{profitCalc.aiCost}) may exceed admin retention.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Auto-Replenish Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Auto-Replenish from Other Commissions
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Automatically deduct from other commission types to replenish AI credits
                  </p>
                </div>
                <Switch
                  checked={settings.autoReplenishEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoReplenishEnabled: checked })}
                />
              </div>

              {settings.autoReplenishEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/30 border">
                  <div className="space-y-2">
                    <Label>Unilevel Deduction (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.unilevelDeductPercent}
                      onChange={(e) => setSettings({ ...settings, unilevelDeductPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stair-Step Deduction (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.stairstepDeductPercent}
                      onChange={(e) => setSettings({ ...settings, stairstepDeductPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Leadership Deduction (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.leadershipDeductPercent}
                      onChange={(e) => setSettings({ ...settings, leadershipDeductPercent: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
              <Button onClick={saveAutoReplenishSettings} disabled={saving === 'Auto-Replenish'} size="sm" className="gap-2 mt-2">
                {saving === 'Auto-Replenish' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Auto-Replenish Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              AI Affiliate Network Members
            </CardTitle>
            <CardDescription>
              Recent members enrolled in the AI affiliate system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No members yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Left Volume</TableHead>
                    <TableHead className="text-right">Right Volume</TableHead>
                    <TableHead className="text-right">Cycles</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{member.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">₱{Number(member.left_volume || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">₱{Number(member.right_volume || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{member.total_cycles || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}