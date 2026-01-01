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
import { Loader2, Save, Plus, Trash2, DollarSign, Clock, Target, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

  // Fetch revenue settings
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

  // Fetch pricing tiers
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

  // Fetch duration tiers
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

  // Fetch interest categories
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

  // Update revenue setting
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

  // Update pricing tier
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

  // Update duration tier
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

  // Update interest category
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
      <Tabs defaultValue="revenue">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue">
            <DollarSign className="w-4 h-4 mr-1" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="pricing">
            <Target className="w-4 h-4 mr-1" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="duration">
            <Clock className="w-4 h-4 mr-1" />
            Duration
          </TabsTrigger>
          <TabsTrigger value="interests">
            <MapPin className="w-4 h-4 mr-1" />
            Interests
          </TabsTrigger>
        </TabsList>

        {/* Revenue Distribution */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Ad Revenue Distribution</CardTitle>
              <CardDescription>
                Configure how ad revenue is split between admin and affiliate pools.
                <Badge variant={totalPercentage === 100 ? 'default' : 'destructive'} className="ml-2">
                  Total: {totalPercentage}%
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {revenueSettings.map((setting) => (
                    <div key={setting.id} className="space-y-2">
                      <Label>{getSettingLabel(setting.setting_key)}</Label>
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
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Ad Pricing Tiers</CardTitle>
              <CardDescription>Set pricing packages with impressions and duration</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPricing ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {pricingTiers.map((tier) => (
                    <Card key={tier.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{tier.tier_name}</h4>
                            <Badge variant={tier.is_active ? 'default' : 'outline'}>
                              {tier.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{tier.description}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>💎 {tier.price_diamonds} diamonds</span>
                            <span>👁 {tier.impressions_included.toLocaleString()} impressions</span>
                            <span>📅 {tier.duration_days} days</span>
                            <span>⚡ Priority {tier.priority_level}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingTier(tier)}>
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Duration Tiers */}
        <TabsContent value="duration">
          <Card>
            <CardHeader>
              <CardTitle>Listing Duration Tiers</CardTitle>
              <CardDescription>Set how long listings are displayed based on payment</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDuration ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {durationTiers.map((tier) => (
                    <Card key={tier.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{tier.tier_name}</h4>
                            {tier.is_default && <Badge variant="secondary">Default</Badge>}
                            <Badge variant={tier.is_active ? 'default' : 'outline'}>
                              {tier.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span>📅 {tier.duration_days} days</span>
                            <span>💎 {tier.price_diamonds} diamonds</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingDuration(tier)}>
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interest Categories */}
        <TabsContent value="interests">
          <Card>
            <CardHeader>
              <CardTitle>Target Interest Categories</CardTitle>
              <CardDescription>Manage interest categories for ad targeting</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInterests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {interestCategories.map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{category.category_name}</h4>
                            <Badge variant={category.is_active ? 'default' : 'outline'}>
                              {category.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {category.interests.slice(0, 5).map((interest) => (
                              <Badge key={interest} variant="secondary" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                            {category.interests.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{category.interests.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setEditingInterest(category)}>
                          Edit
                        </Button>
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
                <Input
                  value={editingTier.tier_name}
                  onChange={(e) => setEditingTier({ ...editingTier, tier_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (Diamonds)</Label>
                  <Input
                    type="number"
                    value={editingTier.price_diamonds}
                    onChange={(e) => setEditingTier({ ...editingTier, price_diamonds: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Impressions Included</Label>
                  <Input
                    type="number"
                    value={editingTier.impressions_included}
                    onChange={(e) => setEditingTier({ ...editingTier, impressions_included: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={editingTier.duration_days}
                    onChange={(e) => setEditingTier({ ...editingTier, duration_days: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Priority Level</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={editingTier.priority_level}
                    onChange={(e) => setEditingTier({ ...editingTier, priority_level: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editingTier.is_active}
                  onCheckedChange={(checked) => setEditingTier({ ...editingTier, is_active: checked })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updatePricingMutation.mutate(editingTier)}
                disabled={updatePricingMutation.isPending}
              >
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
                <Input
                  value={editingDuration.tier_name}
                  onChange={(e) => setEditingDuration({ ...editingDuration, tier_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duration (Days)</Label>
                  <Input
                    type="number"
                    value={editingDuration.duration_days}
                    onChange={(e) => setEditingDuration({ ...editingDuration, duration_days: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <Label>Price (Diamonds)</Label>
                  <Input
                    type="number"
                    value={editingDuration.price_diamonds}
                    onChange={(e) => setEditingDuration({ ...editingDuration, price_diamonds: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Default Tier</Label>
                <Switch
                  checked={editingDuration.is_default}
                  onCheckedChange={(checked) => setEditingDuration({ ...editingDuration, is_default: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={editingDuration.is_active}
                  onCheckedChange={(checked) => setEditingDuration({ ...editingDuration, is_active: checked })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updateDurationMutation.mutate(editingDuration)}
                disabled={updateDurationMutation.isPending}
              >
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
                <Input
                  value={editingInterest.category_name}
                  onChange={(e) => setEditingInterest({ ...editingInterest, category_name: e.target.value })}
                />
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
                        setEditingInterest({
                          ...editingInterest,
                          interests: [...editingInterest.interests, newInterest.trim()],
                        });
                        setNewInterest('');
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newInterest.trim()) {
                        setEditingInterest({
                          ...editingInterest,
                          interests: [...editingInterest.interests, newInterest.trim()],
                        });
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
                <Switch
                  checked={editingInterest.is_active}
                  onCheckedChange={(checked) => setEditingInterest({ ...editingInterest, is_active: checked })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => updateInterestMutation.mutate(editingInterest)}
                disabled={updateInterestMutation.isPending}
              >
                {updateInterestMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}