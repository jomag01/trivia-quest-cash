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
  Wallet
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

export default function BinarySystemManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<BinaryMember[]>([]);
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
    leadershipDeductPercent: 20
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
        .like('key', 'binary_%');

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
        });
        setSettings(newSettings);
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

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settingsToSave = [
        { key: 'binary_join_amount', value: settings.joinAmount.toString() },
        { key: 'binary_cycle_volume', value: settings.cycleVolume.toString() },
        { key: 'binary_cycle_commission', value: settings.cycleCommission.toString() },
        { key: 'binary_daily_cap', value: settings.dailyCap.toString() },
        { key: 'binary_admin_safety_net', value: settings.adminSafetyNet.toString() },
        { key: 'binary_auto_replenish_enabled', value: settings.autoReplenishEnabled.toString() },
        { key: 'binary_auto_replenish_percent', value: settings.autoReplenishPercent.toString() },
        { key: 'binary_unilevel_deduct_percent', value: settings.unilevelDeductPercent.toString() },
        { key: 'binary_stairstep_deduct_percent', value: settings.stairstepDeductPercent.toString() },
        { key: 'binary_leadership_deduct_percent', value: settings.leadershipDeductPercent.toString() }
      ];

      for (const setting of settingsToSave) {
        await supabase
          .from('app_settings')
          .upsert({ key: setting.key, value: setting.value }, { onConflict: 'key' });
      }

      toast.success('Binary system settings saved!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const calculateExample = () => {
    const purchaseAmount = settings.joinAmount;
    const adminKeeps = (purchaseAmount * settings.adminSafetyNet) / 100;
    const affiliatePool = purchaseAmount - adminKeeps;
    const cycleEarning = settings.cycleCommission;
    
    return { purchaseAmount, adminKeeps, affiliatePool, cycleEarning };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const example = calculateExample();

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

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Binary System Settings
            </CardTitle>
            <CardDescription>
              Configure the binary MLM system for AI credits
            </CardDescription>
          </CardHeader>
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
                  <p className="text-sm font-medium mb-2">Example Calculation:</p>
                  <div className="space-y-1 text-xs">
                    <p>Purchase: ₱{example.purchaseAmount}</p>
                    <p>Admin keeps ({settings.adminSafetyNet}%): <span className="text-green-500">₱{example.adminKeeps.toFixed(2)}</span></p>
                    <p>Affiliate pool: ₱{example.affiliatePool.toFixed(2)}</p>
                  </div>
                </div>
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
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Binary Network Members
            </CardTitle>
            <CardDescription>
              Recent members enrolled in the binary system
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