import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Globe, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Crown, 
  Percent, 
  Loader2,
  Save,
  CreditCard
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
  is_active: boolean;
  unilevel_commission_percent: number;
  stairstep_commission_percent: number;
  leadership_commission_percent: number;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  billing_cycle: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount_paid: number;
  created_at: string;
}

export default function WebsiteBuilderSubscriptionManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("plans");
  
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch plans
      const { data: plansData, error: plansError } = await supabase
        .from('website_builder_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (plansError) throw plansError;
      
      const parsedPlans = (plansData || []).map(p => {
        let features: string[] = [];
        if (Array.isArray(p.features)) {
          features = p.features as string[];
        } else if (typeof p.features === 'string') {
          try {
            features = JSON.parse(p.features);
          } catch {
            features = [];
          }
        }
        return { ...p, features };
      });
      setPlans(parsedPlans);

      // Fetch subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('website_builder_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('website_builder_plans')
        .update({
          name: editingPlan.name,
          description: editingPlan.description,
          monthly_price: editingPlan.monthly_price,
          yearly_price: editingPlan.yearly_price,
          features: editingPlan.features,
          is_active: editingPlan.is_active,
          unilevel_commission_percent: editingPlan.unilevel_commission_percent,
          stairstep_commission_percent: editingPlan.stairstep_commission_percent,
          leadership_commission_percent: editingPlan.leadership_commission_percent
        })
        .eq('id', editingPlan.id);

      if (error) throw error;
      
      toast.success('Plan updated successfully');
      fetchData();
      setEditingPlan(null);
    } catch (error: any) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const activeSubscribers = subscriptions.filter(s => s.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            Website Builder Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage subscription plans and commissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscribers</p>
                <p className="text-2xl font-bold">{activeSubscribers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <Crown className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Plans</p>
                <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly MRR</p>
                <p className="text-2xl font-bold">
                  ${(subscriptions.filter(s => s.status === 'active' && s.billing_cycle === 'monthly').length * (plans[0]?.monthly_price || 0)).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
          <TabsTrigger value="plans" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            <Crown className="h-4 w-4 mr-2" />
            Plans & Pricing
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            <Percent className="h-4 w-4 mr-2" />
            Commission Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          {plans.map(plan => (
            <Card key={plan.id} className="bg-gradient-to-br from-card to-muted/30 border-primary/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={plan.is_active ? "default" : "secondary"} className={plan.is_active ? "bg-gradient-to-r from-green-500 to-emerald-500" : ""}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Price ($)</Label>
                    <Input
                      type="number"
                      value={editingPlan?.id === plan.id ? editingPlan.monthly_price : plan.monthly_price}
                      onChange={e => {
                        if (editingPlan?.id === plan.id) {
                          setEditingPlan({ ...editingPlan, monthly_price: parseFloat(e.target.value) || 0 });
                        } else {
                          setEditingPlan({ ...plan, monthly_price: parseFloat(e.target.value) || 0 });
                        }
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yearly Price ($)</Label>
                    <Input
                      type="number"
                      value={editingPlan?.id === plan.id ? editingPlan.yearly_price : plan.yearly_price}
                      onChange={e => {
                        if (editingPlan?.id === plan.id) {
                          setEditingPlan({ ...editingPlan, yearly_price: parseFloat(e.target.value) || 0 });
                        } else {
                          setEditingPlan({ ...plan, yearly_price: parseFloat(e.target.value) || 0 });
                        }
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unilevel Commission (%)</Label>
                    <Input
                      type="number"
                      value={editingPlan?.id === plan.id ? editingPlan.unilevel_commission_percent : plan.unilevel_commission_percent}
                      onChange={e => {
                        if (editingPlan?.id === plan.id) {
                          setEditingPlan({ ...editingPlan, unilevel_commission_percent: parseFloat(e.target.value) || 0 });
                        } else {
                          setEditingPlan({ ...plan, unilevel_commission_percent: parseFloat(e.target.value) || 0 });
                        }
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Stairstep Commission (%)</Label>
                    <Input
                      type="number"
                      value={editingPlan?.id === plan.id ? editingPlan.stairstep_commission_percent : plan.stairstep_commission_percent}
                      onChange={e => {
                        if (editingPlan?.id === plan.id) {
                          setEditingPlan({ ...editingPlan, stairstep_commission_percent: parseFloat(e.target.value) || 0 });
                        } else {
                          setEditingPlan({ ...plan, stairstep_commission_percent: parseFloat(e.target.value) || 0 });
                        }
                      }}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Leadership Commission (%)</Label>
                    <Input
                      type="number"
                      value={editingPlan?.id === plan.id ? editingPlan.leadership_commission_percent : plan.leadership_commission_percent}
                      onChange={e => {
                        if (editingPlan?.id === plan.id) {
                          setEditingPlan({ ...editingPlan, leadership_commission_percent: parseFloat(e.target.value) || 0 });
                        } else {
                          setEditingPlan({ ...plan, leadership_commission_percent: parseFloat(e.target.value) || 0 });
                        }
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-6">
                    <Switch
                      checked={editingPlan?.id === plan.id ? editingPlan.is_active : plan.is_active}
                      onCheckedChange={checked => {
                        if (editingPlan?.id === plan.id) {
                          setEditingPlan({ ...editingPlan, is_active: checked });
                        } else {
                          setEditingPlan({ ...plan, is_active: checked });
                        }
                      }}
                    />
                    <Label>Plan Active</Label>
                  </div>
                </div>

                {editingPlan?.id === plan.id && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSavePlan} 
                      disabled={saving}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="bg-gradient-to-br from-card to-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-500" />
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium font-mono text-xs">
                        {sub.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        {plans.find(p => p.id === sub.plan_id)?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {sub.billing_cycle}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          sub.status === 'active' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                            : sub.status === 'cancelled'
                              ? 'bg-gradient-to-r from-red-500 to-rose-500'
                              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        }>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${sub.amount_paid?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        {new Date(sub.current_period_end).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {subscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No subscriptions yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-purple-500" />
                Commission Distribution
              </CardTitle>
              <CardDescription>
                Configure how subscription revenue is distributed to affiliates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border-blue-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-semibold">Unilevel</h3>
                    </div>
                    <p className="text-3xl font-bold text-blue-500">
                      {plans[0]?.unilevel_commission_percent || 10}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Direct referral commission
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-semibold">Stairstep</h3>
                    </div>
                    <p className="text-3xl font-bold text-green-500">
                      {plans[0]?.stairstep_commission_percent || 5}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Team volume bonus
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                        <Crown className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-semibold">Leadership</h3>
                    </div>
                    <p className="text-3xl font-bold text-purple-500">
                      {plans[0]?.leadership_commission_percent || 3}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Leadership override
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> Commission percentages are calculated from the subscription price. 
                  Total commission distribution: {(plans[0]?.unilevel_commission_percent || 10) + (plans[0]?.stairstep_commission_percent || 5) + (plans[0]?.leadership_commission_percent || 3)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
