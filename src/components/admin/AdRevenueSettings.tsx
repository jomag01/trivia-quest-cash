import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, DollarSign, Clock, Target, MapPin, CreditCard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AdPaymentDetailsDialog from './AdPaymentDetailsDialog';

interface RevenueSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

interface PricingTier {
  id: string;
  tier_name: string;
  price_diamonds: number;
  impressions_included: number;
  duration_days: number;
  priority_level: number;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

interface DurationTier {
  id: string;
  tier_name: string;
  duration_days: number;
  price_diamonds: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
}

interface InterestCategory {
  id: string;
  category_name: string;
  interests: string[];
  is_active: boolean;
  display_order: number;
}

export default function AdRevenueSettings() {
  const queryClient = useQueryClient();
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [editingDuration, setEditingDuration] = useState<DurationTier | null>(null);
  const [editingInterest, setEditingInterest] = useState<InterestCategory | null>(null);
  const [newInterest, setNewInterest] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const { data: revenueSettings = [], isLoading: loadingRevenue } = useQuery({
    queryKey: ['ad-revenue-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_revenue_settings')
        .select('*')
        .order('setting_key');
      if (error) throw error;
      return data as RevenueSetting[];
    },
  });

  const { data: pricingTiers = [], isLoading: loadingPricing } = useQuery({
    queryKey: ['ad-pricing-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_pricing_tiers')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as PricingTier[];
    },
  });

  const { data: durationTiers = [], isLoading: loadingDuration } = useQuery({
    queryKey: ['listing-duration-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_duration_tiers')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as DurationTier[];
    },
  });

  const { data: interestCategories = [], isLoading: loadingInterests } = useQuery({
    queryKey: ['ad-interest-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_interest_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as InterestCategory[];
    },
  });

  const updateRevenueMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('ad_revenue_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-revenue-settings'] });
      toast.success('Revenue setting updated');
    },
    onError: () => toast.error('Failed to update setting'),
  });

  const updatePricingMutation = useMutation({
    mutationFn: async (tier: PricingTier) => {
      const { error } = await supabase
        .from('ad_pricing_tiers')
        .update({
          tier_name: tier.tier_name,
          price_diamonds: tier.price_diamonds,
          impressions_included: tier.impressions_included,
          duration_days: tier.duration_days,
          priority_level: tier.priority_level,
          description: tier.description,
          is_active: tier.is_active,
        })
        .eq('id', tier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-pricing-tiers'] });
      toast.success('Pricing tier updated');
      setEditingTier(null);
    },
    onError: () => toast.error('Failed to update pricing tier'),
  });

  const updateDurationMutation = useMutation({
    mutationFn: async (tier: DurationTier) => {
      const { error } = await supabase
        .from('listing_duration_tiers')
        .update({
          tier_name: tier.tier_name,
          duration_days: tier.duration_days,
          price_diamonds: tier.price_diamonds,
          is_default: tier.is_default,
          is_active: tier.is_active,
        })
        .eq('id', tier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-duration-tiers'] });
      toast.success('Duration tier updated');
      setEditingDuration(null);
    },
    onError: () => toast.error('Failed to update duration tier'),
  });

  const updateInterestMutation = useMutation({
    mutationFn: async (category: InterestCategory) => {
      const { error } = await supabase
        .from('ad_interest_categories')
        .update({
          category_name: category.category_name,
          interests: category.interests,
          is_active: category.is_active,
        })
        .eq('id', category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-interest-categories'] });
      toast.success('Interest category updated');
      setEditingInterest(null);
    },
    onError: () => toast.error('Failed to update interest category'),
  });

  const getSettingLabel = (key: string) => {
    const labels: Record<string, string> = {
      admin_net_profit_percentage: 'Admin Net Profit %',
      unilevel_pool_percentage: 'Unilevel Pool %',
      stairstep_pool_percentage: 'Stair-Step Pool %',
      leadership_pool_percentage: 'Leadership Pool %',
    };
    return labels[key] || key;
  };

  const totalPercentage = revenueSettings.reduce((sum, s) => sum + parseInt(s.setting_value || '0'), 0);

  return (
    <div className="space-y-6">
      {/* Colorful Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <DollarSign className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Ad Revenue & Pricing</h2>
          </div>
          <p className="text-white/80 text-sm">Configure revenue splits, pricing tiers, durations, and targeting options</p>
        </div>
        <Button
          onClick={() => setShowPaymentDialog(true)}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Payment Details
        </Button>
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30 p-1 rounded-xl">
          <TabsTrigger 
            value="revenue"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-lg transition-all text-xs sm:text-sm"
          >
            <DollarSign className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger 
            value="pricing"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-teal-600 data-[state=active]:text-white rounded-lg transition-all text-xs sm:text-sm"
          >
            <Target className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Pricing</span>
          </TabsTrigger>
          <TabsTrigger 
            value="duration"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white rounded-lg transition-all text-xs sm:text-sm"
          >
            <Clock className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Duration</span>
          </TabsTrigger>
          <TabsTrigger 
            value="interests"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all text-xs sm:text-sm"
          >
            <MapPin className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Interests</span>
          </TabsTrigger>
        </TabsList>

        {/* Revenue Distribution */}
        <TabsContent value="revenue" className="mt-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/20 dark:to-background">
            <CardHeader className="border-b border-emerald-100 dark:border-emerald-800/30">
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <div className="p-1.5 rounded-md bg-emerald-500/10">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                </div>
                Ad Revenue Distribution
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                Configure how ad revenue is split.
                <Badge variant={totalPercentage === 100 ? 'default' : 'destructive'} className={totalPercentage === 100 ? 'bg-emerald-500' : ''}>
                  Total: {totalPercentage}%
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingRevenue ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {revenueSettings.map((setting) => (
                    <div key={setting.id} className="space-y-2 p-4 rounded-xl bg-white dark:bg-background border border-emerald-200 dark:border-emerald-800/30 shadow-sm">
                      <Label className="font-medium">{getSettingLabel(setting.setting_key)}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={setting.setting_value}
                          onChange={(e) => {
                            const newSettings = revenueSettings.map((s) =>
                              s.id === setting.id ? { ...s, setting_value: e.target.value } : s
                            );
                            queryClient.setQueryData(['ad-revenue-settings'], newSettings);
                          }}
                          className="w-24"
                        />
                        <span className="flex items-center text-muted-foreground">%</span>
                        <Button
                          size="sm"
                          onClick={() => updateRevenueMutation.mutate({ key: setting.setting_key, value: setting.setting_value })}
                          disabled={updateRevenueMutation.isPending}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">{setting.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tiers */}
        <TabsContent value="pricing" className="mt-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-background">
            <CardHeader className="border-b border-teal-100 dark:border-teal-800/30">
              <CardTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
                <div className="p-1.5 rounded-md bg-teal-500/10">
                  <Target className="w-4 h-4 text-teal-500" />
                </div>
                Ad Pricing Tiers
              </CardTitle>
              <CardDescription>Set pricing packages with impressions and duration</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingPricing ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {pricingTiers.map((tier) => (
                    <Card key={tier.id} className="p-4 bg-gradient-to-r from-teal-500/10 to-teal-500/5 border-teal-200 dark:border-teal-800/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{tier.tier_name}</h4>
                            <Badge className={tier.is_active ? 'bg-green-500' : ''}>
                              {tier.is_active ? '✓ Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{tier.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 text-xs">💎 {tier.price_diamonds}</span>
                            <span className="px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs">👁 {tier.impressions_included.toLocaleString()}</span>
                            <span className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs">📅 {tier.duration_days}d</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingTier(tier)}>Edit</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Tiers */}
        <TabsContent value="duration" className="mt-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-900/20 dark:to-background">
            <CardHeader className="border-b border-cyan-100 dark:border-cyan-800/30">
              <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                <div className="p-1.5 rounded-md bg-cyan-500/10">
                  <Clock className="w-4 h-4 text-cyan-500" />
                </div>
                Listing Duration Tiers
              </CardTitle>
              <CardDescription>Set how long listings are displayed based on payment</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingDuration ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {durationTiers.map((tier) => (
                    <Card key={tier.id} className="p-4 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 border-cyan-200 dark:border-cyan-800/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{tier.tier_name}</h4>
                            {tier.is_default && <Badge variant="secondary">Default</Badge>}
                            <Badge className={tier.is_active ? 'bg-green-500' : ''}>
                              {tier.is_active ? '✓ Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex gap-3 mt-2 text-sm">
                            <span className="px-2 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">📅 {tier.duration_days} days</span>
                            <span className="px-2 py-1 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">💎 {tier.price_diamonds}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingDuration(tier)}>Edit</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interest Categories */}
        <TabsContent value="interests" className="mt-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-background">
            <CardHeader className="border-b border-blue-100 dark:border-blue-800/30">
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <div className="p-1.5 rounded-md bg-blue-500/10">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                Target Interest Categories
              </CardTitle>
              <CardDescription>Manage interest categories for ad targeting</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingInterests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {interestCategories.map((category) => (
                    <Card key={category.id} className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{category.category_name}</h4>
                            <Badge className={category.is_active ? 'bg-green-500' : ''}>
                              {category.is_active ? '✓ Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {category.interests.slice(0, 5).map((interest) => (
                              <Badge key={interest} variant="secondary" className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {interest}
                              </Badge>
                            ))}
                            {category.interests.length > 5 && (
                              <Badge variant="outline" className="text-xs">+{category.interests.length - 5}</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingInterest(category)}>Edit</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Pricing Tier Dialog */}
      <Dialog open={!!editingTier} onOpenChange={() => setEditingTier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pricing Tier</DialogTitle>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div>
                <Label>Tier Name</Label>
                <Input value={editingTier.tier_name} onChange={(e) => setEditingTier({ ...editingTier, tier_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (Diamonds)</Label>
                  <Input type="number" value={editingTier.price_diamonds} onChange={(e) => setEditingTier({ ...editingTier, price_diamonds: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Impressions</Label>
                  <Input type="number" value={editingTier.impressions_included} onChange={(e) => setEditingTier({ ...editingTier, impressions_included: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (Days)</Label>
                  <Input type="number" value={editingTier.duration_days} onChange={(e) => setEditingTier({ ...editingTier, duration_days: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Input type="number" min="1" max="10" value={editingTier.priority_level} onChange={(e) => setEditingTier({ ...editingTier, priority_level: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editingTier.is_active} onCheckedChange={(checked) => setEditingTier({ ...editingTier, is_active: checked })} />
              </div>
              <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500" onClick={() => updatePricingMutation.mutate(editingTier)} disabled={updatePricingMutation.isPending}>
                {updatePricingMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Duration Tier Dialog */}
      <Dialog open={!!editingDuration} onOpenChange={() => setEditingDuration(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duration Tier</DialogTitle>
          </DialogHeader>
          {editingDuration && (
            <div className="space-y-4">
              <div>
                <Label>Tier Name</Label>
                <Input value={editingDuration.tier_name} onChange={(e) => setEditingDuration({ ...editingDuration, tier_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (Days)</Label>
                  <Input type="number" value={editingDuration.duration_days} onChange={(e) => setEditingDuration({ ...editingDuration, duration_days: parseInt(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Price (Diamonds)</Label>
                  <Input type="number" value={editingDuration.price_diamonds} onChange={(e) => setEditingDuration({ ...editingDuration, price_diamonds: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Default Tier</Label>
                <Switch checked={editingDuration.is_default} onCheckedChange={(checked) => setEditingDuration({ ...editingDuration, is_default: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editingDuration.is_active} onCheckedChange={(checked) => setEditingDuration({ ...editingDuration, is_active: checked })} />
              </div>
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500" onClick={() => updateDurationMutation.mutate(editingDuration)} disabled={updateDurationMutation.isPending}>
                {updateDurationMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Interest Category Dialog */}
      <Dialog open={!!editingInterest} onOpenChange={() => setEditingInterest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Interest Category</DialogTitle>
          </DialogHeader>
          {editingInterest && (
            <div className="space-y-4">
              <div>
                <Label>Category Name</Label>
                <Input value={editingInterest.category_name} onChange={(e) => setEditingInterest({ ...editingInterest, category_name: e.target.value })} />
              </div>
              <div>
                <Label>Interests</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {editingInterest.interests.map((interest) => (
                    <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                      {interest}
                      <button
                        onClick={() => setEditingInterest({
                          ...editingInterest,
                          interests: editingInterest.interests.filter((i) => i !== interest),
                        })}
                        className="ml-1 hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new interest..."
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newInterest.trim()) {
                        setEditingInterest({ ...editingInterest, interests: [...editingInterest.interests, newInterest.trim()] });
                        setNewInterest('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newInterest.trim()) {
                        setEditingInterest({ ...editingInterest, interests: [...editingInterest.interests, newInterest.trim()] });
                        setNewInterest('');
                      }
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editingInterest.is_active} onCheckedChange={(checked) => setEditingInterest({ ...editingInterest, is_active: checked })} />
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500" onClick={() => updateInterestMutation.mutate(editingInterest)} disabled={updateInterestMutation.isPending}>
                {updateInterestMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Details Dialog */}
      <AdPaymentDetailsDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog} />
    </div>
  );
}