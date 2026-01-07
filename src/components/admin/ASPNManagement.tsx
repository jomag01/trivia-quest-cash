import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  TrendingUp, Settings, Users, Coins, Edit2, Save, 
  Play, Pause, RefreshCw, ChevronRight, Award, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { ASPNAbuseMonitor } from "./ASPNAbuseMonitor";

interface ASPNTier {
  id: string;
  tier_name: string;
  tier_key: string;
  price_php: number;
  admin_profit_percent: number;
  aspn_pool_percent: number;
  sp_rate: number;
  lifetime_cap: number | null;
  auto_deduct_enabled: boolean;
  is_active: boolean;
  display_order: number;
}

interface ASPNPool {
  id: string;
  pool_name: string;
  total_pool_amount: number;
  distributed_amount: number;
  remaining_amount: number;
  is_active: boolean;
}

interface ASPNSetting {
  id: string;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
}

interface ASPNCycle {
  id: string;
  cycle_number: number;
  cycle_start: string;
  cycle_end: string;
  total_sp_in_cycle: number;
  total_distributed: number;
  status: string;
}

export function ASPNManagement() {
  const [tiers, setTiers] = useState<ASPNTier[]>([]);
  const [pools, setPools] = useState<ASPNPool[]>([]);
  const [settings, setSettings] = useState<ASPNSetting[]>([]);
  const [cycles, setCycles] = useState<ASPNCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<ASPNTier | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSP: 0,
    totalDistributed: 0,
    graduatedUsers: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, poolsRes, settingsRes, cyclesRes, enrollmentRes] = await Promise.all([
        supabase.from('aspn_tiers').select('*').order('display_order'),
        supabase.from('aspn_pools').select('*'),
        supabase.from('aspn_settings').select('*'),
        supabase.from('aspn_cycles').select('*').order('cycle_number', { ascending: false }).limit(10),
        supabase.from('aspn_user_enrollment').select('id, is_graduated, total_sp_earned, total_earnings')
      ]);

      if (tiersRes.data) setTiers(tiersRes.data);
      if (poolsRes.data) setPools(poolsRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      if (cyclesRes.data) setCycles(cyclesRes.data);
      
      if (enrollmentRes.data) {
        setStats({
          totalUsers: enrollmentRes.data.length,
          totalSP: enrollmentRes.data.reduce((sum, e) => sum + Number(e.total_sp_earned || 0), 0),
          totalDistributed: enrollmentRes.data.reduce((sum, e) => sum + Number(e.total_earnings || 0), 0),
          graduatedUsers: enrollmentRes.data.filter(e => e.is_graduated).length
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
        .from('aspn_tiers')
        .upsert({
          ...editingTier,
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
        .from('aspn_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);
      
      setSettings(prev => prev.map(s => 
        s.setting_key === key ? { ...s, setting_value: value } : s
      ));
      toast.success('Setting updated');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const toggleTierActive = async (tier: ASPNTier) => {
    try {
      await supabase
        .from('aspn_tiers')
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Enrolled Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.totalSP.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total SP</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">₱{stats.totalDistributed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Distributed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{stats.graduatedUsers}</p>
              <p className="text-xs text-muted-foreground">Graduated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiers">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tiers">Tiers</TabsTrigger>
          <TabsTrigger value="pools">Pools</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="abuse" className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Abuse
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          {tiers.map((tier) => (
            <Card key={tier.id} className={!tier.is_active ? 'opacity-50' : ''}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-gradient-to-br ${
                      tier.tier_key === 'platinum' ? 'from-purple-500 to-indigo-600' :
                      tier.tier_key === 'gold' ? 'from-amber-500 to-yellow-600' :
                      tier.tier_key === 'silver' ? 'from-gray-400 to-gray-500' :
                      'from-orange-400 to-orange-500'
                    } text-white`}>
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{tier.tier_name}</h3>
                        <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                          {tier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ₱{tier.price_php} entry
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
                  <div>
                    <span className="text-muted-foreground">Admin Profit:</span>
                    <span className="ml-1 font-medium">{tier.admin_profit_percent}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pool:</span>
                    <span className="ml-1 font-medium">{tier.aspn_pool_percent}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SP Rate:</span>
                    <span className="ml-1 font-medium">{tier.sp_rate}x</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cap:</span>
                    <span className="ml-1 font-medium">
                      {tier.lifetime_cap ? `₱${tier.lifetime_cap.toLocaleString()}` : 'Unlimited'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pools" className="space-y-4">
          {pools.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                No pools configured yet
              </CardContent>
            </Card>
          ) : (
            pools.map((pool) => (
              <Card key={pool.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{pool.pool_name}</h3>
                    <Badge variant={pool.is_active ? 'default' : 'secondary'}>
                      {pool.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">₱{Number(pool.total_pool_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Distributed</p>
                      <p className="font-semibold text-green-600">₱{Number(pool.distributed_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Remaining</p>
                      <p className="font-semibold text-blue-600">₱{Number(pool.remaining_amount).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="cycles">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Distribution Cycles
                <Button size="sm" variant="outline" onClick={fetchData}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cycles.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No cycles yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Total SP</TableHead>
                      <TableHead>Distributed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cycles.map((cycle) => (
                      <TableRow key={cycle.id}>
                        <TableCell>#{cycle.cycle_number}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(cycle.cycle_start).toLocaleDateString()} - {new Date(cycle.cycle_end).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{Number(cycle.total_sp_in_cycle).toLocaleString()}</TableCell>
                        <TableCell>₱{Number(cycle.total_distributed).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={cycle.status === 'completed' ? 'default' : cycle.status === 'processing' ? 'secondary' : 'outline'}>
                            {cycle.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abuse">
          <ASPNAbuseMonitor />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ASPN Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between">
                  <div>
                    <Label>{setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  </div>
                  <Input
                    className="w-32"
                    value={setting.setting_value || ''}
                    onChange={(e) => updateSetting(setting.setting_key, e.target.value)}
                  />
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
            <DialogTitle>Edit ASPN Tier</DialogTitle>
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
                  <Label>Entry Price (PHP)</Label>
                  <Input
                    type="number"
                    value={editingTier.price_php}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, price_php: Number(e.target.value) } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Admin Profit %</Label>
                  <Input
                    type="number"
                    value={editingTier.admin_profit_percent}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, admin_profit_percent: Number(e.target.value) } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ASPN Pool %</Label>
                  <Input
                    type="number"
                    value={editingTier.aspn_pool_percent}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, aspn_pool_percent: Number(e.target.value) } : null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>SP Rate Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editingTier.sp_rate}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, sp_rate: Number(e.target.value) } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lifetime Cap (PHP)</Label>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={editingTier.lifetime_cap || ''}
                    onChange={(e) => setEditingTier(prev => prev ? { ...prev, lifetime_cap: e.target.value ? Number(e.target.value) : null } : null)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Enable Auto-Deduct</Label>
                <Switch
                  checked={editingTier.auto_deduct_enabled}
                  onCheckedChange={(checked) => setEditingTier(prev => prev ? { ...prev, auto_deduct_enabled: checked } : null)}
                />
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