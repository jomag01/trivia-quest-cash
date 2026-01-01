import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Loader2, Settings2 } from 'lucide-react';

interface FeatureDefinition {
  id: string;
  entity_type: string;
  feature_name: string;
  feature_label: string;
  feature_type: string;
  options: string[];
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

const ENTITY_TYPES = [
  { value: 'marketplace', label: 'Marketplace Listings' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'product', label: 'Shop Products' },
  { value: 'service', label: 'Services' },
];

const FEATURE_TYPES = [
  { value: 'boolean', label: 'Yes/No Toggle' },
  { value: 'text', label: 'Text Input' },
  { value: 'number', label: 'Number Input' },
  { value: 'select', label: 'Dropdown Select' },
];

export default function ListingFeaturesManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('marketplace');
  const [showDialog, setShowDialog] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureDefinition | null>(null);
  const [formData, setFormData] = useState({
    feature_name: '',
    feature_label: '',
    feature_type: 'boolean',
    options: '',
    icon: '',
  });

  const { data: features = [], isLoading } = useQuery({
    queryKey: ['feature-definitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_feature_definitions')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as FeatureDefinition[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('listing_feature_definitions').insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-definitions'] });
      toast.success('Feature created');
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create feature'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('listing_feature_definitions').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-definitions'] });
      toast.success('Feature updated');
      resetForm();
    },
    onError: () => toast.error('Failed to update feature'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('listing_feature_definitions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-definitions'] });
      toast.success('Feature deleted');
    },
    onError: () => toast.error('Failed to delete feature'),
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingFeature(null);
    setFormData({
      feature_name: '',
      feature_label: '',
      feature_type: 'boolean',
      options: '',
      icon: '',
    });
  };

  const handleEdit = (feature: FeatureDefinition) => {
    setEditingFeature(feature);
    setFormData({
      feature_name: feature.feature_name,
      feature_label: feature.feature_label,
      feature_type: feature.feature_type,
      options: feature.options?.join(', ') || '',
      icon: feature.icon || '',
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    const data = {
      entity_type: activeTab,
      feature_name: formData.feature_name.toLowerCase().replace(/\s+/g, '_'),
      feature_label: formData.feature_label,
      feature_type: formData.feature_type,
      options: formData.feature_type === 'select' 
        ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
        : [],
      icon: formData.icon || null,
    };

    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredFeatures = features.filter(f => f.entity_type === activeTab);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Custom Listing Features
          </CardTitle>
          <CardDescription>
            Define additional features sellers can add to their listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              {ENTITY_TYPES.map(type => (
                <TabsTrigger key={type.value} value={type.value} className="text-xs">
                  {type.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {ENTITY_TYPES.map(type => (
              <TabsContent key={type.value} value={type.value}>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Features for {type.label}</h4>
                  <Button size="sm" onClick={() => setShowDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Feature
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : filteredFeatures.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No custom features defined for {type.label.toLowerCase()}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredFeatures.map(feature => (
                      <Card key={feature.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {feature.icon && <span className="text-lg">{feature.icon}</span>}
                            <div>
                              <p className="font-medium text-sm">{feature.feature_label}</p>
                              <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {feature.feature_type}
                                </Badge>
                                <Badge variant={feature.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {feature.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(feature)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(feature.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? 'Edit Feature' : 'Add New Feature'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feature Label</Label>
              <Input
                value={formData.feature_label}
                onChange={(e) => setFormData({ ...formData, feature_label: e.target.value })}
                placeholder="e.g., Pet Friendly"
              />
            </div>
            <div>
              <Label>Feature Name (system)</Label>
              <Input
                value={formData.feature_name}
                onChange={(e) => setFormData({ ...formData, feature_name: e.target.value })}
                placeholder="e.g., pet_friendly"
              />
            </div>
            <div>
              <Label>Feature Type</Label>
              <Select
                value={formData.feature_type}
                onValueChange={(value) => setFormData({ ...formData, feature_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FEATURE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.feature_type === 'select' && (
              <div>
                <Label>Options (comma-separated)</Label>
                <Input
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  placeholder="Option 1, Option 2, Option 3"
                />
              </div>
            )}
            <div>
              <Label>Icon (emoji)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="🏠"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending || !formData.feature_label}
            >
              {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Feature'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
