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
import { Crown, Save, Loader2, Check, X, Calendar, Users, DollarSign, Sparkles, Settings, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

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

export default function AISubscriptionManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  
  // Settings state
  const [monthlyPrice, setMonthlyPrice] = useState('1390');
  const [yearlyPrice, setYearlyPrice] = useState('11990');
  const [monthlyCredits, setMonthlyCredits] = useState('500');
  const [yearlyCredits, setYearlyCredits] = useState('6000');
  const [topupPricePerCredit, setTopupPricePerCredit] = useState('3');
  const [topupMinCredits, setTopupMinCredits] = useState('100');
  const [topupAdminProfit, setTopupAdminProfit] = useState('35');
  const [topupAiCostPercent, setTopupAiCostPercent] = useState('20');
  const [topupUnilevelPercent, setTopupUnilevelPercent] = useState('25');
  const [topupStairstepPercent, setTopupStairstepPercent] = useState('15');
  const [topupLeadershipPercent, setTopupLeadershipPercent] = useState('5');
  const [binaryVolumeMonthly, setBinaryVolumeMonthly] = useState('1390');
  const [binaryVolumeYearly, setBinaryVolumeYearly] = useState('11990');

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
        .like('key', 'ai_subscription_%');

      data?.forEach(s => {
        if (s.key === 'ai_subscription_monthly_price') setMonthlyPrice(s.value || '1390');
        if (s.key === 'ai_subscription_yearly_price') setYearlyPrice(s.value || '11990');
        if (s.key === 'ai_subscription_monthly_credits') setMonthlyCredits(s.value || '500');
        if (s.key === 'ai_subscription_yearly_credits') setYearlyCredits(s.value || '6000');
        if (s.key === 'ai_topup_price_per_credit') setTopupPricePerCredit(s.value || '3');
        if (s.key === 'ai_topup_min_credits') setTopupMinCredits(s.value || '100');
        if (s.key === 'ai_topup_admin_profit') setTopupAdminProfit(s.value || '35');
        if (s.key === 'ai_topup_ai_cost_percent') setTopupAiCostPercent(s.value || '20');
        if (s.key === 'ai_topup_unilevel_percent') setTopupUnilevelPercent(s.value || '25');
        if (s.key === 'ai_topup_stairstep_percent') setTopupStairstepPercent(s.value || '15');
        if (s.key === 'ai_topup_leadership_percent') setTopupLeadershipPercent(s.value || '5');
        if (s.key === 'ai_subscription_binary_volume_monthly') setBinaryVolumeMonthly(s.value || '1390');
        if (s.key === 'ai_subscription_binary_volume_yearly') setBinaryVolumeYearly(s.value || '11990');
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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'ai_subscription_monthly_price', value: monthlyPrice },
        { key: 'ai_subscription_yearly_price', value: yearlyPrice },
        { key: 'ai_subscription_monthly_credits', value: monthlyCredits },
        { key: 'ai_subscription_yearly_credits', value: yearlyCredits },
        { key: 'ai_topup_price_per_credit', value: topupPricePerCredit },
        { key: 'ai_topup_min_credits', value: topupMinCredits },
        { key: 'ai_topup_admin_profit', value: topupAdminProfit },
        { key: 'ai_topup_ai_cost_percent', value: topupAiCostPercent },
        { key: 'ai_topup_unilevel_percent', value: topupUnilevelPercent },
        { key: 'ai_topup_stairstep_percent', value: topupStairstepPercent },
        { key: 'ai_topup_leadership_percent', value: topupLeadershipPercent },
        { key: 'ai_subscription_binary_volume_monthly', value: binaryVolumeMonthly },
        { key: 'ai_subscription_binary_volume_yearly', value: binaryVolumeYearly },
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
      const credits = sub.plan_type === 'monthly' 
        ? parseInt(monthlyCredits) 
        : parseInt(yearlyCredits);
      const binaryVolume = sub.plan_type === 'monthly'
        ? parseFloat(binaryVolumeMonthly)
        : parseFloat(binaryVolumeYearly);

      // Update subscription to active
      await supabase
        .from('ai_subscriptions')
        .update({
          status: 'active',
          credits_remaining: credits,
          binary_volume_added: true,
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
        binary_volume_added: binaryVolume,
        payment_method: 'qrcode',
        payment_reference: sub.payment_reference
      });

      // Add binary volume if user is in binary network
      const { data: binaryNode } = await supabase
        .from('binary_network')
        .select('id, parent_id, placement_leg, left_volume, right_volume')
        .eq('user_id', sub.user_id)
        .maybeSingle();

      if (binaryNode && binaryNode.parent_id) {
        // Get parent node and update volume
        const { data: parentNode } = await supabase
          .from('binary_network')
          .select('id, left_volume, right_volume')
          .eq('id', binaryNode.parent_id)
          .single();

        if (parentNode) {
          const volumeColumn = binaryNode.placement_leg === 'left' ? 'left_volume' : 'right_volume';
          const currentVolume = binaryNode.placement_leg === 'left' 
            ? (parentNode.left_volume || 0) 
            : (parentNode.right_volume || 0);
          
          await supabase
            .from('binary_network')
            .update({ [volumeColumn]: currentVolume + binaryVolume })
            .eq('id', binaryNode.parent_id);
        }
      }

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
        <TabsTrigger value="settings" className="gap-1 text-xs">
          <Settings className="h-3 w-3" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="restrictions" className="gap-1 text-xs">
          <EyeOff className="h-3 w-3" />
          Monthly Limits
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
            {/* Subscription Plans */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Monthly Plan
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₱)</Label>
                    <Input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Credits Included</Label>
                    <Input type="number" value={monthlyCredits} onChange={e => setMonthlyCredits(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Binary Volume</Label>
                    <Input type="number" value={binaryVolumeMonthly} onChange={e => setBinaryVolumeMonthly(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
                <h4 className="font-medium flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Yearly Plan
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Price (₱)</Label>
                    <Input type="number" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Credits Included</Label>
                    <Input type="number" value={yearlyCredits} onChange={e => setYearlyCredits(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Binary Volume</Label>
                    <Input type="number" value={binaryVolumeYearly} onChange={e => setBinaryVolumeYearly(e.target.value)} />
                  </div>
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
              {totalCommission !== 100 && (
                <p className="text-xs text-destructive mt-2">Total must equal 100%</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="restrictions">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-primary" />
              Monthly Subscriber Restrictions
            </CardTitle>
            <CardDescription>
              Hide specific AI features from monthly subscribers. Yearly subscribers have full access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {restrictions.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{r.feature_name}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={r.is_hidden ? 'destructive' : 'secondary'}>
                      {r.is_hidden ? 'Hidden' : 'Visible'}
                    </Badge>
                    <Switch
                      checked={r.is_hidden}
                      onCheckedChange={() => toggleRestriction(r.id, r.is_hidden)}
                    />
                  </div>
                </div>
              ))}
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