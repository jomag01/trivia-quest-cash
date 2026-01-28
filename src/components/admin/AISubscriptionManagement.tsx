import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Save, Loader2, Check, X, Calendar, Users, DollarSign, Sparkles, Settings, Eye, EyeOff, BarChart3, Hexagon, Layers, List, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import ServiceVisibilityManager from './ServiceVisibilityManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface FeatureRestriction {
  id: string;
  feature_key: string;
  feature_name: string;
  is_hidden: boolean;
  description: string;
}

interface PendingSubscription {
  id: string;
  user_id: string;
  plan_type: string;
  amount_paid: number;
  payment_reference: string;
  created_at: string;
  profiles?: { display_name: string; email: string };
}

interface PendingTopup {
  id: string;
  user_id: string;
  amount: number;
  credits_purchased: number;
  payment_reference: string;
  created_at: string;
  profiles?: { display_name: string; email: string };
}

interface SubscriptionTier {
  id: string;
  key: string;
  name: string;
  price: string;
  credits: string;
  icon: 'calendar' | 'hexagon' | 'crown';
  bgClass?: string;
}

const defaultTiers: SubscriptionTier[] = [
  { id: '1', key: 'monthly_basic', name: 'Basic Monthly', price: '1390', credits: '500', icon: 'calendar' },
  { id: '2', key: 'monthly_plus', name: 'Plus Monthly', price: '2490', credits: '1200', icon: 'hexagon', bgClass: 'bg-gradient-to-br from-purple-500/5 to-pink-500/5' },
  { id: '3', key: 'monthly_pro', name: 'Pro Monthly', price: '3990', credits: '2500', icon: 'crown', bgClass: 'bg-gradient-to-br from-yellow-500/5 to-orange-500/5' },
];

export default function AISubscriptionManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('tiers');
  
  // Dynamic tiers state
  const [tiers, setTiers] = useState<SubscriptionTier[]>(defaultTiers);

  // Top-up settings
  const [topupPricePerCredit, setTopupPricePerCredit] = useState('3');
  const [topupMinCredits, setTopupMinCredits] = useState('100');
  const [topupAdminProfit, setTopupAdminProfit] = useState('35');
  const [topupAiCostPercent, setTopupAiCostPercent] = useState('20');
  const [topupUnilevelPercent, setTopupUnilevelPercent] = useState('25');
  const [topupStairstepPercent, setTopupStairstepPercent] = useState('15');
  const [topupLeadershipPercent, setTopupLeadershipPercent] = useState('5');

  // Ads Package settings
  const [adsPackagePrice, setAdsPackagePrice] = useState('2500');
  const [adsPackageCredits, setAdsPackageCredits] = useState('300');
  const [adsPackageImpressions, setAdsPackageImpressions] = useState('10000');
  const [adsPackageDays, setAdsPackageDays] = useState('30');
  const [adsPackageEnabled, setAdsPackageEnabled] = useState(true);

  // Feature restrictions
  const [restrictions, setRestrictions] = useState<FeatureRestriction[]>([]);
  
  // Pending approvals
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([]);
  const [pendingTopups, setPendingTopups] = useState<PendingTopup[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchRestrictions(), fetchPending()]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'ai_%');

      // Also fetch tiers data
      const { data: tiersData } = await supabase
        .from('app_settings')
        .select('key, value')
        .eq('key', 'ai_subscription_tiers');

      if (tiersData && tiersData.length > 0 && tiersData[0].value) {
        try {
          const parsedTiers = JSON.parse(tiersData[0].value);
          if (Array.isArray(parsedTiers) && parsedTiers.length > 0) {
            setTiers(parsedTiers);
          }
        } catch (e) {
          console.error('Error parsing tiers:', e);
        }
      }

      data?.forEach(s => {
        if (s.key === 'ai_topup_price_per_credit') setTopupPricePerCredit(s.value || '3');
        if (s.key === 'ai_topup_min_credits') setTopupMinCredits(s.value || '100');
        if (s.key === 'ai_topup_admin_profit') setTopupAdminProfit(s.value || '35');
        if (s.key === 'ai_topup_ai_cost_percent') setTopupAiCostPercent(s.value || '20');
        if (s.key === 'ai_topup_unilevel_percent') setTopupUnilevelPercent(s.value || '25');
        if (s.key === 'ai_topup_stairstep_percent') setTopupStairstepPercent(s.value || '15');
        if (s.key === 'ai_topup_leadership_percent') setTopupLeadershipPercent(s.value || '5');
        // Ads Package settings
        if (s.key === 'ads_package_price') setAdsPackagePrice(s.value || '2500');
        if (s.key === 'ads_package_credits') setAdsPackageCredits(s.value || '300');
        if (s.key === 'ads_package_impressions') setAdsPackageImpressions(s.value || '10000');
        if (s.key === 'ads_package_days') setAdsPackageDays(s.value || '30');
        if (s.key === 'ads_package_enabled') setAdsPackageEnabled(s.value === 'true');
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const fetchRestrictions = async () => {
    try {
      const { data } = await supabase
        .from('ai_monthly_restrictions')
        .select('*')
        .order('feature_name');

      if (data) setRestrictions(data);
    } catch (error) {
      console.error('Error fetching restrictions:', error);
    }
  };

  const fetchPending = async () => {
    try {
      const [subsResult, topupsResult] = await Promise.all([
        supabase
          .from('ai_subscriptions')
          .select('*, profiles:user_id(display_name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('ai_credit_topups')
          .select('*, profiles:user_id(display_name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      ]);

      if (subsResult.data) setPendingSubscriptions(subsResult.data as any);
      if (topupsResult.data) setPendingTopups(topupsResult.data as any);
    } catch (error) {
      console.error('Error fetching pending:', error);
    }
  };

  const updateTier = (tierId: string, field: keyof SubscriptionTier, value: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, [field]: value } : tier
    ));
  };

  const addNewTier = () => {
    const newTier: SubscriptionTier = {
      id: Date.now().toString(),
      key: `tier_${tiers.length + 1}`,
      name: `New Plan ${tiers.length + 1}`,
      price: '0',
      credits: '0',
      icon: 'calendar'
    };
    setTiers(prev => [...prev, newTier]);
    toast.success('New tier added');
  };

  const deleteTier = (tierId: string) => {
    if (tiers.length <= 1) {
      toast.error('Cannot delete the last tier');
      return;
    }
    setTiers(prev => prev.filter(tier => tier.id !== tierId));
    toast.success('Tier deleted');
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'ai_subscription_tiers', value: JSON.stringify(tiers) },
        { key: 'ai_topup_price_per_credit', value: topupPricePerCredit },
        { key: 'ai_topup_min_credits', value: topupMinCredits },
        { key: 'ai_topup_admin_profit', value: topupAdminProfit },
        { key: 'ai_topup_ai_cost_percent', value: topupAiCostPercent },
        { key: 'ai_topup_unilevel_percent', value: topupUnilevelPercent },
        { key: 'ai_topup_stairstep_percent', value: topupStairstepPercent },
        { key: 'ai_topup_leadership_percent', value: topupLeadershipPercent },
        // Ads Package settings
        { key: 'ads_package_price', value: adsPackagePrice },
        { key: 'ads_package_credits', value: adsPackageCredits },
        { key: 'ads_package_impressions', value: adsPackageImpressions },
        { key: 'ads_package_days', value: adsPackageDays },
        { key: 'ads_package_enabled', value: adsPackageEnabled ? 'true' : 'false' },
      ];

      for (const update of updates) {
        await supabase.from('app_settings').upsert(update, { onConflict: 'key' });
      }

      toast.success('Subscription settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleRestriction = async (id: string, currentValue: boolean) => {
    try {
      await supabase
        .from('ai_monthly_restrictions')
        .update({ is_hidden: !currentValue, updated_at: new Date().toISOString() })
        .eq('id', id);

      setRestrictions(prev => prev.map(r => 
        r.id === id ? { ...r, is_hidden: !currentValue } : r
      ));

      toast.success(`Feature ${!currentValue ? 'hidden' : 'shown'} for monthly subscribers`);
    } catch (error) {
      console.error('Error toggling restriction:', error);
      toast.error('Failed to update restriction');
    }
  };

  const approveSubscription = async (sub: PendingSubscription) => {
    setProcessing(sub.id);
    try {
      // Find the matching tier for credits
      const matchedTier = tiers.find(t => t.key === sub.plan_type);
      const credits = matchedTier ? parseInt(matchedTier.credits) : 500;

      // Update subscription to active
      await supabase
        .from('ai_subscriptions')
        .update({
          status: 'active',
          credits_remaining: credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      // Add to subscription history
      await supabase.from('ai_subscription_history').insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        plan_type: sub.plan_type,
        amount_paid: sub.amount_paid,
        credits_granted: credits,
        action: 'purchase',
        payment_method: 'qrcode',
        payment_reference: sub.payment_reference
      });

      toast.success('Subscription approved');
      fetchPending();
    } catch (error) {
      console.error('Error approving subscription:', error);
      toast.error('Failed to approve subscription');
    } finally {
      setProcessing(null);
    }
  };

  const rejectSubscription = async (id: string) => {
    setProcessing(id);
    try {
      await supabase
        .from('ai_subscriptions')
        .update({ status: 'cancelled', admin_notes: 'Rejected by admin' })
        .eq('id', id);

      toast.success('Subscription rejected');
      fetchPending();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const approveTopup = async (topup: PendingTopup) => {
    setProcessing(topup.id);
    try {
      const amount = topup.amount;
      const adminProfit = amount * (parseFloat(topupAdminProfit) / 100);
      const aiCost = amount * (parseFloat(topupAiCostPercent) / 100);
      const unilevelComm = amount * (parseFloat(topupUnilevelPercent) / 100);
      const stairstepComm = amount * (parseFloat(topupStairstepPercent) / 100);
      const leadershipComm = amount * (parseFloat(topupLeadershipPercent) / 100);

      // Update topup record
      await supabase
        .from('ai_credit_topups')
        .update({
          status: 'approved',
          admin_profit: adminProfit,
          ai_cost_deduction: aiCost,
          unilevel_commission: unilevelComm,
          stairstep_commission: stairstepComm,
          leadership_commission: leadershipComm,
          approved_at: new Date().toISOString()
        })
        .eq('id', topup.id);

      // Add credits to user's subscription
      await supabase.rpc('add_subscription_credits', {
        p_user_id: topup.user_id,
        p_credits: topup.credits_purchased
      });

      // Record in subscription history
      await supabase.from('ai_subscription_history').insert({
        user_id: topup.user_id,
        plan_type: 'topup',
        amount_paid: amount,
        credits_granted: topup.credits_purchased,
        action: 'topup',
        payment_method: 'qrcode',
        payment_reference: topup.payment_reference
      });

      toast.success('Top-up approved and credits added');
      fetchPending();
    } catch (error) {
      console.error('Error approving topup:', error);
      toast.error('Failed to approve top-up');
    } finally {
      setProcessing(null);
    }
  };

  const rejectTopup = async (id: string) => {
    setProcessing(id);
    try {
      await supabase
        .from('ai_credit_topups')
        .update({ status: 'rejected', admin_notes: 'Rejected by admin' })
        .eq('id', id);

      toast.success('Top-up rejected');
      fetchPending();
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const totalCommission = parseFloat(topupAdminProfit) + parseFloat(topupAiCostPercent) + 
    parseFloat(topupUnilevelPercent) + parseFloat(topupStairstepPercent) + parseFloat(topupLeadershipPercent);

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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="visibility" className="gap-1 text-xs">
          <EyeOff className="h-3 w-3" />
          Visibility
        </TabsTrigger>
        <TabsTrigger value="settings" className="gap-1 text-xs">
          <Settings className="h-3 w-3" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="subscriptions" className="gap-1 text-xs">
          <Crown className="h-3 w-3" />
          Pending ({pendingSubscriptions.length})
        </TabsTrigger>
        <TabsTrigger value="topups" className="gap-1 text-xs">
          <Sparkles className="h-3 w-3" />
          Top-ups ({pendingTopups.length})
        </TabsTrigger>
      </TabsList>

      {/* Service Visibility Tab */}
      <TabsContent value="visibility">
        <ServiceVisibilityManager />
      </TabsContent>

      <TabsContent value="settings">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Subscription Pricing
                </CardTitle>
                <CardDescription>Configure subscription plans and credits</CardDescription>
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} size="sm" className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subscription Plans - Dynamic Tiers */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Subscription Tiers</h4>
              <Button onClick={addNewTier} size="sm" variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Tier
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {tiers.map((tier) => {
                const TierIcon = tier.icon === 'crown' ? Crown : tier.icon === 'hexagon' ? Hexagon : Calendar;
                return (
                  <div key={tier.id} className={`space-y-4 p-4 border rounded-lg relative ${tier.bgClass || ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TierIcon className="h-4 w-4 text-primary" />
                        <Input 
                          value={tier.name} 
                          onChange={e => updateTier(tier.id, 'name', e.target.value)}
                          className="font-medium h-8 text-sm"
                          placeholder="Tier Name"
                        />
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Tier?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{tier.name}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTier(tier.id)} className="bg-destructive text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Price (₱)</Label>
                        <Input type="number" value={tier.price} onChange={e => updateTier(tier.id, 'price', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Credits Included</Label>
                        <Input type="number" value={tier.credits} onChange={e => updateTier(tier.id, 'credits', e.target.value)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ads Package Settings */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-orange-500" />
                  AI + Ads Combo Package
                </h4>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Enabled</Label>
                  <Switch checked={adsPackageEnabled} onCheckedChange={setAdsPackageEnabled} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Combination package with AI credits + Ads promotion. Buyers are entered into AI Beehives.
              </p>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-1">
                  <Label className="text-xs">Price (₱)</Label>
                  <Input type="number" value={adsPackagePrice} onChange={e => setAdsPackagePrice(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">AI Credits</Label>
                  <Input type="number" value={adsPackageCredits} onChange={e => setAdsPackageCredits(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ad Impressions</Label>
                  <Input type="number" value={adsPackageImpressions} onChange={e => setAdsPackageImpressions(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duration (Days)</Label>
                  <Input type="number" value={adsPackageDays} onChange={e => setAdsPackageDays(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Top-up Settings */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Credit Top-up Settings
              </h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Price per Credit (₱)</Label>
                  <Input type="number" value={topupPricePerCredit} onChange={e => setTopupPricePerCredit(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Minimum Credits</Label>
                  <Input type="number" value={topupMinCredits} onChange={e => setTopupMinCredits(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Commission Distribution */}
            <div className="border-t pt-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Top-up Commission Distribution
                <Badge variant={totalCommission === 100 ? 'default' : 'destructive'} className="ml-2">
                  Total: {totalCommission}%
                </Badge>
              </h4>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="space-y-1">
                  <Label className="text-xs">Admin Profit %</Label>
                  <Input type="number" value={topupAdminProfit} onChange={e => setTopupAdminProfit(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">AI Cost %</Label>
                  <Input type="number" value={topupAiCostPercent} onChange={e => setTopupAiCostPercent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unilevel %</Label>
                  <Input type="number" value={topupUnilevelPercent} onChange={e => setTopupUnilevelPercent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stairstep %</Label>
                  <Input type="number" value={topupStairstepPercent} onChange={e => setTopupStairstepPercent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Leadership %</Label>
                  <Input type="number" value={topupLeadershipPercent} onChange={e => setTopupLeadershipPercent(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total: {totalCommission}% (remaining {Math.max(0, 100 - totalCommission)}% retained by admin)
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="subscriptions">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Pending Subscription Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingSubscriptions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending subscriptions</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.profiles?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{sub.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.plan_type === 'yearly' ? 'default' : 'secondary'}>
                          {sub.plan_type}
                        </Badge>
                      </TableCell>
                      <TableCell>₱{sub.amount_paid.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{sub.payment_reference}</TableCell>
                      <TableCell className="text-xs">{format(new Date(sub.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveSubscription(sub)}
                            disabled={processing === sub.id}
                          >
                            {processing === sub.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectSubscription(sub.id)}
                            disabled={processing === sub.id}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="topups">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Pending Top-up Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingTopups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending top-ups</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingTopups.map((topup) => (
                    <TableRow key={topup.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{topup.profiles?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{topup.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{topup.credits_purchased.toLocaleString()}</TableCell>
                      <TableCell>₱{topup.amount.toLocaleString()}</TableCell>
                      <TableCell className="font-mono text-xs">{topup.payment_reference}</TableCell>
                      <TableCell className="text-xs">{format(new Date(topup.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveTopup(topup)}
                            disabled={processing === topup.id}
                          >
                            {processing === topup.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectTopup(topup.id)}
                            disabled={processing === topup.id}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}