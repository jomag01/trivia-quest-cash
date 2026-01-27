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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Check, Globe, Palette, Code, Headphones, Package, Users, Zap, Crown, Layers, Map, ShoppingBag, BarChart3 } from "lucide-react";
import WhiteLabelTierCard from "./whitelabel/WhiteLabelTierCard";
import WhiteLabelJourney from "./whitelabel/WhiteLabelJourney";
import WhiteLabelSubscriptionCard from "./whitelabel/WhiteLabelSubscriptionCard";

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
  { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { key: 'basic_analytics', label: 'Basic Analytics', icon: BarChart3 },
  { key: 'analytics', label: 'Advanced Analytics', icon: BarChart3 },
  { key: 'affiliate', label: 'Affiliate System', icon: Users },
  { key: 'ads', label: 'Advertising Platform', icon: Layers },
  { key: 'ai_tools', label: 'AI Tools', icon: Zap },
  { key: 'auction', label: 'Auction System', icon: Crown },
  { key: 'food_delivery', label: 'Food Delivery', icon: Map },
];

const featureCategories: Record<string, string> = {
  core: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  analytics: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  marketing: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  commerce: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

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

  const pendingCount = subscriptions.filter(s => s.status === 'pending').length;
  const activeCount = subscriptions.filter(s => s.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            White-Label
          </h2>
          <p className="text-xs text-muted-foreground">Configure tiers & manage clients</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {tiers.length} Tiers
          </Badge>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500 text-white text-xs">
              {pendingCount} Pending
            </Badge>
          )}
          {activeCount > 0 && (
            <Badge className="bg-green-500 text-white text-xs">
              {activeCount} Active
            </Badge>
          )}
        </div>
      </div>

      {/* User Journey Guide */}
      <WhiteLabelJourney />

      {/* Main Content Tabs */}
      <Tabs defaultValue="tiers" className="space-y-3">
        <TabsList className="h-9 p-1">
          <TabsTrigger value="tiers" className="text-xs px-3">Tiers</TabsTrigger>
          <TabsTrigger value="subscriptions" className="text-xs px-3">
            Clients {pendingCount > 0 && <span className="ml-1 text-[10px] bg-amber-500 text-white rounded-full px-1.5">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs px-3">Features</TabsTrigger>
        </TabsList>

        {/* Pricing Tiers Tab */}
        <TabsContent value="tiers" className="space-y-3 mt-0">
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="h-3 w-3 mr-1" /> Add Tier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] p-0">
                <DialogHeader className="p-4 pb-2">
                  <DialogTitle className="text-base">{editingTier ? 'Edit Tier' : 'Create New Tier'}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-4 pb-4">
                  <div className="space-y-3">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Tier Name *</Label>
                        <Input
                          className="h-8 text-sm"
                          value={formData.tier_name}
                          onChange={(e) => setFormData({ ...formData, tier_name: e.target.value })}
                          placeholder="Professional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tier Key *</Label>
                        <Input
                          className="h-8 text-sm"
                          value={formData.tier_key}
                          onChange={(e) => setFormData({ ...formData, tier_key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                          placeholder="professional"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        className="text-sm min-h-[60px]"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe this tier..."
                      />
                    </div>

                    {/* Price & Billing */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Price (PHP)</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={formData.price_php}
                          onChange={(e) => setFormData({ ...formData, price_php: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Billing</Label>
                        <Select value={formData.billing_cycle} onValueChange={(v) => setFormData({ ...formData, billing_cycle: v })}>
                          <SelectTrigger className="h-8 text-sm">
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

                    {/* Limits */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Max Users</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={formData.max_users}
                          onChange={(e) => setFormData({ ...formData, max_users: e.target.value })}
                          placeholder="∞"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Products</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={formData.max_products}
                          onChange={(e) => setFormData({ ...formData, max_products: e.target.value })}
                          placeholder="∞"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Storage (GB)</Label>
                        <Input
                          type="number"
                          className="h-8 text-sm"
                          value={formData.max_storage_gb}
                          onChange={(e) => setFormData({ ...formData, max_storage_gb: e.target.value })}
                          placeholder="∞"
                        />
                      </div>
                    </div>

                    {/* Systems */}
                    <div className="space-y-2">
                      <Label className="text-xs">Included Systems</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {systemOptions.map((system) => (
                          <div
                            key={system.key}
                            onClick={() => toggleSystem(system.key)}
                            className={`flex items-center gap-1.5 p-2 rounded border cursor-pointer transition-all text-xs ${
                              formData.included_systems.includes(system.key)
                                ? 'bg-primary/10 border-primary'
                                : 'hover:bg-muted'
                            }`}
                          >
                            <system.icon className="h-3.5 w-3.5" />
                            <span className="flex-1">{system.label}</span>
                            {formData.included_systems.includes(system.key) && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional Features */}
                    <div className="space-y-2">
                      <Label className="text-xs">Additional Features</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center justify-between p-2 rounded border text-xs">
                          <div className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5" />
                            <span>Domain</span>
                          </div>
                          <Switch
                            checked={formData.custom_domain}
                            onCheckedChange={(checked) => setFormData({ ...formData, custom_domain: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-2 rounded border text-xs">
                          <div className="flex items-center gap-1.5">
                            <Palette className="h-3.5 w-3.5" />
                            <span>Branding</span>
                          </div>
                          <Switch
                            checked={formData.custom_branding}
                            onCheckedChange={(checked) => setFormData({ ...formData, custom_branding: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-2 rounded border text-xs">
                          <div className="flex items-center gap-1.5">
                            <Code className="h-3.5 w-3.5" />
                            <span>API</span>
                          </div>
                          <Switch
                            checked={formData.api_access}
                            onCheckedChange={(checked) => setFormData({ ...formData, api_access: checked })}
                          />
                        </div>
                        <div className="flex items-center justify-between p-2 rounded border text-xs">
                          <div className="flex items-center gap-1.5">
                            <Headphones className="h-3.5 w-3.5" />
                            <span>Priority</span>
                          </div>
                          <Switch
                            checked={formData.priority_support}
                            onCheckedChange={(checked) => setFormData({ ...formData, priority_support: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="tier-active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                        />
                        <Label htmlFor="tier-active" className="text-xs">Active</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-8 text-xs" onClick={handleSubmit}>
                          {editingTier ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tier Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiers.map((tier) => (
              <WhiteLabelTierCard
                key={tier.id}
                tier={tier}
                systemOptions={systemOptions}
                onEdit={openEditDialog}
                onDelete={deleteTier}
              />
            ))}
          </div>

          {tiers.length === 0 && (
            <Card className="p-8 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No pricing tiers yet. Add your first tier to get started.</p>
            </Card>
          )}
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-3 mt-0">
          {subscriptions.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No subscription applications yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subscriptions.map((sub) => {
                const tier = tiers.find(t => t.id === sub.tier_id);
                return (
                  <WhiteLabelSubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    tierName={tier?.tier_name || 'Unknown Tier'}
                    onApprove={(id) => updateSubscriptionStatus(id, 'active')}
                    onReject={(id) => updateSubscriptionStatus(id, 'rejected')}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="mt-0">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Available Features</CardTitle>
              <CardDescription className="text-xs">Configure which features can be included in packages</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {features.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No features configured
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {features.map((feature) => (
                    <div key={feature.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{feature.feature_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{feature.description}</div>
                        <Badge 
                          variant="outline" 
                          className={`text-[9px] mt-1 ${featureCategories[feature.category] || 'bg-muted'}`}
                        >
                          {feature.category}
                        </Badge>
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
