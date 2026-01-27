import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Check, X, Crown, Zap, Building2, Users, Package, HardDrive, Globe, Palette, Code, Headphones } from "lucide-react";

interface WhiteLabelTier {
  id: string;
  tier_name: string;
  tier_key: string;
  description: string;
  price_php: number;
  billing_cycle: string;
  features: any;
  included_systems: string[];
  max_users: number | null;
  max_products: number | null;
  max_storage_gb: number | null;
  custom_domain: boolean;
  custom_branding: boolean;
  api_access: boolean;
  priority_support: boolean;
  display_order: number;
  is_active: boolean;
}

interface WhiteLabelFeature {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string;
  category: string;
  is_active: boolean;
  display_order: number;
}

interface WhiteLabelSubscription {
  id: string;
  client_id: string;
  tier_id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  custom_domain: string;
  status: string;
  payment_method: string;
  payment_reference: string;
  amount_paid: number;
  starts_at: string;
  expires_at: string;
  admin_notes: string;
  created_at: string;
}

const systemOptions = [
  { key: 'marketplace', label: 'Marketplace', icon: Package },
  { key: 'basic_analytics', label: 'Basic Analytics', icon: Zap },
  { key: 'analytics', label: 'Advanced Analytics', icon: Zap },
  { key: 'affiliate', label: 'Affiliate System', icon: Users },
  { key: 'ads', label: 'Advertising Platform', icon: Globe },
  { key: 'ai_tools', label: 'AI Tools', icon: Code },
  { key: 'auction', label: 'Auction System', icon: Crown },
  { key: 'food_delivery', label: 'Food Delivery', icon: Package },
];

export default function WhiteLabelManagement() {
  const [tiers, setTiers] = useState<WhiteLabelTier[]>([]);
  const [features, setFeatures] = useState<WhiteLabelFeature[]>([]);
  const [subscriptions, setSubscriptions] = useState<WhiteLabelSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<WhiteLabelTier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tier_name: '',
    tier_key: '',
    description: '',
    price_php: 0,
    billing_cycle: 'monthly',
    max_users: '',
    max_products: '',
    max_storage_gb: '',
    custom_domain: false,
    custom_branding: false,
    api_access: false,
    priority_support: false,
    included_systems: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiersRes, featuresRes, subsRes] = await Promise.all([
        supabase.from('whitelabel_tiers').select('*').order('display_order'),
        supabase.from('whitelabel_features').select('*').order('display_order'),
        supabase.from('whitelabel_subscriptions').select('*').order('created_at', { ascending: false }),
      ]);

      if (tiersRes.data) setTiers(tiersRes.data);
      if (featuresRes.data) setFeatures(featuresRes.data);
      if (subsRes.data) setSubscriptions(subsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load white-label data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tier_name: '',
      tier_key: '',
      description: '',
      price_php: 0,
      billing_cycle: 'monthly',
      max_users: '',
      max_products: '',
      max_storage_gb: '',
      custom_domain: false,
      custom_branding: false,
      api_access: false,
      priority_support: false,
      included_systems: [],
      is_active: true,
    });
    setEditingTier(null);
  };

  const openEditDialog = (tier: WhiteLabelTier) => {
    setEditingTier(tier);
    setFormData({
      tier_name: tier.tier_name,
      tier_key: tier.tier_key,
      description: tier.description || '',
      price_php: tier.price_php,
      billing_cycle: tier.billing_cycle,
      max_users: tier.max_users?.toString() || '',
      max_products: tier.max_products?.toString() || '',
      max_storage_gb: tier.max_storage_gb?.toString() || '',
      custom_domain: tier.custom_domain,
      custom_branding: tier.custom_branding,
      api_access: tier.api_access,
      priority_support: tier.priority_support,
      included_systems: tier.included_systems || [],
      is_active: tier.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.tier_name || !formData.tier_key) {
      toast.error('Please fill in required fields');
      return;
    }

    const tierData = {
      tier_name: formData.tier_name,
      tier_key: formData.tier_key,
      description: formData.description,
      price_php: formData.price_php,
      billing_cycle: formData.billing_cycle,
      max_users: formData.max_users ? parseInt(formData.max_users) : null,
      max_products: formData.max_products ? parseInt(formData.max_products) : null,
      max_storage_gb: formData.max_storage_gb ? parseInt(formData.max_storage_gb) : null,
      custom_domain: formData.custom_domain,
      custom_branding: formData.custom_branding,
      api_access: formData.api_access,
      priority_support: formData.priority_support,
      included_systems: formData.included_systems,
      is_active: formData.is_active,
    };

    try {
      if (editingTier) {
        const { error } = await supabase
          .from('whitelabel_tiers')
          .update(tierData)
          .eq('id', editingTier.id);
        if (error) throw error;
        toast.success('Tier updated successfully');
      } else {
        const { error } = await supabase
          .from('whitelabel_tiers')
          .insert([{ ...tierData, display_order: tiers.length + 1 }]);
        if (error) throw error;
        toast.success('Tier created successfully');
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error saving tier:', error);
      toast.error(error.message || 'Failed to save tier');
    }
  };

  const deleteTier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;
    
    try {
      const { error } = await supabase.from('whitelabel_tiers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tier deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tier');
    }
  };

  const toggleSystem = (systemKey: string) => {
    setFormData(prev => ({
      ...prev,
      included_systems: prev.included_systems.includes(systemKey)
        ? prev.included_systems.filter(s => s !== systemKey)
        : [...prev.included_systems, systemKey]
    }));
  };

  const updateSubscriptionStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      if (status === 'active') {
        updates.approved_at = new Date().toISOString();
        updates.starts_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const { error } = await supabase
        .from('whitelabel_subscriptions')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
      toast.success(`Subscription ${status}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update subscription');
    }
  };

  const getTierIcon = (tierKey: string) => {
    switch (tierKey) {
      case 'starter': return <Zap className="h-6 w-6 text-primary" />;
      case 'professional': return <Crown className="h-6 w-6 text-accent-foreground" />;
      case 'enterprise': return <Building2 className="h-6 w-6 text-secondary-foreground" />;
      default: return <Package className="h-6 w-6" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">White-Label Management</h2>
          <p className="text-muted-foreground">Configure white-label subscription tiers and manage clients</p>
        </div>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers">Pricing Tiers</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTier ? 'Edit Tier' : 'Create New Tier'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tier Name *</Label>
                      <Input
                        value={formData.tier_name}
                        onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                        placeholder="e.g., Professional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tier Key *</Label>
                      <Input
                        value={formData.tier_key}
                        onChange={(e) => setFormData({ ...formData, tier_key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        placeholder="e.g., professional"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this tier offers..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price (PHP)</Label>
                      <Input
                        type="number"
                        value={formData.price_php}
                        onChange={(e) => setFormData({ ...formData, price_php: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Billing Cycle</Label>
                      <Select value={formData.billing_cycle} onValueChange={(v) => setFormData({ ...formData, billing_cycle: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Max Users</Label>
                      <Input
                        type="number"
                        value={formData.max_users}
                        onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Products</Label>
                      <Input
                        type="number"
                        value={formData.max_products}
                        onChange={(e) => setFormData({ ...formData, max_products: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Storage (GB)</Label>
                      <Input
                        type="number"
                        value={formData.max_storage_gb}
                        onChange={(e) => setFormData({ ...formData, max_storage_gb: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Included Systems</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {systemOptions.map((system) => (
                        <div
                          key={system.key}
                          onClick={() => toggleSystem(system.key)}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            formData.included_systems.includes(system.key)
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <system.icon className="h-4 w-4" />
                          <span className="text-sm">{system.label}</span>
                          {formData.included_systems.includes(system.key) && (
                            <Check className="h-4 w-4 ml-auto text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Additional Features</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="text-sm">Custom Domain</span>
                        </div>
                        <Switch
                          checked={formData.custom_domain}
                          onCheckedChange={(checked) => setFormData({ ...formData, custom_domain: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          <span className="text-sm">Custom Branding</span>
                        </div>
                        <Switch
                          checked={formData.custom_branding}
                          onCheckedChange={(checked) => setFormData({ ...formData, custom_branding: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          <span className="text-sm">API Access</span>
                        </div>
                        <Switch
                          checked={formData.api_access}
                          onCheckedChange={(checked) => setFormData({ ...formData, api_access: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <Headphones className="h-4 w-4" />
                          <span className="text-sm">Priority Support</span>
                        </div>
                        <Switch
                          checked={formData.priority_support}
                          onCheckedChange={(checked) => setFormData({ ...formData, priority_support: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmit}>
                        {editingTier ? 'Update' : 'Create'} Tier
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.id} className={`relative ${!tier.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="text-center pb-2">
                  <div className="flex justify-center mb-2">
                    {getTierIcon(tier.tier_key)}
                  </div>
                  <CardTitle className="text-xl">{tier.tier_name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <span className="text-3xl font-bold">₱{tier.price_php.toLocaleString()}</span>
                    <span className="text-muted-foreground">/{tier.billing_cycle}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{tier.max_users || 'Unlimited'} Users</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{tier.max_products || 'Unlimited'} Products</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span>{tier.max_storage_gb || 'Unlimited'} GB Storage</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {tier.included_systems?.map((sys) => (
                      <Badge key={sys} variant="secondary" className="text-xs">
                        {systemOptions.find(s => s.key === sys)?.label || sys}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      {tier.custom_domain ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-muted-foreground" />}
                      <span>Custom Domain</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {tier.custom_branding ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-muted-foreground" />}
                      <span>Custom Branding</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {tier.api_access ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-muted-foreground" />}
                      <span>API Access</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {tier.priority_support ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-muted-foreground" />}
                      <span>Priority Support</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditDialog(tier)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteTier(tier.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>White-Label Subscriptions</CardTitle>
              <CardDescription>Manage client subscriptions and approvals</CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No subscriptions yet
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => {
                    const tier = tiers.find(t => t.id === sub.tier_id);
                    return (
                      <div key={sub.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{sub.client_name}</div>
                          <div className="text-sm text-muted-foreground">{sub.client_email}</div>
                          {sub.company_name && (
                            <div className="text-sm">{sub.company_name}</div>
                          )}
                          <Badge variant={
                            sub.status === 'active' ? 'default' :
                            sub.status === 'pending' ? 'secondary' :
                            'destructive'
                          } className="mt-1 capitalize">
                            {sub.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{tier?.tier_name || 'Unknown Tier'}</div>
                          <div className="text-sm text-muted-foreground">
                            ₱{sub.amount_paid.toLocaleString()}
                          </div>
                          {sub.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" onClick={() => updateSubscriptionStatus(sub.id, 'active')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => updateSubscriptionStatus(sub.id, 'rejected')}>
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Features</CardTitle>
              <CardDescription>Configure which features can be included in white-label packages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {features.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{feature.feature_name}</div>
                      <div className="text-sm text-muted-foreground">{feature.description}</div>
                      <Badge variant="outline" className="mt-1">{feature.category}</Badge>
                    </div>
                    <Switch
                      checked={feature.is_active}
                      onCheckedChange={async (checked) => {
                        await supabase
                          .from('whitelabel_features')
                          .update({ is_active: checked })
                          .eq('id', feature.id);
                        fetchData();
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
