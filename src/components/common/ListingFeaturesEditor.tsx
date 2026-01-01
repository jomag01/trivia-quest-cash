import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Settings2, Save } from 'lucide-react';

interface FeatureDefinition {
  id: string;
  feature_name: string;
  feature_label: string;
  feature_type: string;
  options: string[];
  icon: string | null;
}

interface ListingFeature {
  id: string;
  feature_definition_id: string;
  feature_value: string;
}

interface ListingFeaturesEditorProps {
  entityType: 'marketplace' | 'restaurant' | 'product' | 'service';
  entityId: string;
  compact?: boolean;
}

export function ListingFeaturesEditor({ entityType, entityId, compact = false }: ListingFeaturesEditorProps) {
  const queryClient = useQueryClient();
  const [featureValues, setFeatureValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: definitions = [], isLoading: loadingDefs } = useQuery({
    queryKey: ['feature-definitions', entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_feature_definitions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as FeatureDefinition[];
    },
  });

  const { data: existingFeatures = [], isLoading: loadingFeatures } = useQuery({
    queryKey: ['listing-features', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_features')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      if (error) throw error;
      return data as ListingFeature[];
    },
    enabled: !!entityId,
  });

  // Initialize feature values from existing data
  useEffect(() => {
    const values: Record<string, string> = {};
    existingFeatures.forEach(f => {
      values[f.feature_definition_id] = f.feature_value;
    });
    setFeatureValues(values);
    setHasChanges(false);
  }, [existingFeatures]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upsert all feature values
      const inserts = Object.entries(featureValues)
        .filter(([_, value]) => value !== '' && value !== 'false')
        .map(([defId, value]) => ({
          entity_type: entityType,
          entity_id: entityId,
          feature_definition_id: defId,
          feature_value: value,
        }));

      // Delete removed features
      const defIdsToKeep = inserts.map(i => i.feature_definition_id);
      
      if (defIdsToKeep.length > 0) {
        await supabase
          .from('listing_features')
          .delete()
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .not('feature_definition_id', 'in', `(${defIdsToKeep.join(',')})`);
      } else {
        await supabase
          .from('listing_features')
          .delete()
          .eq('entity_type', entityType)
          .eq('entity_id', entityId);
      }

      // Upsert features
      if (inserts.length > 0) {
        const { error } = await supabase
          .from('listing_features')
          .upsert(inserts, { onConflict: 'entity_type,entity_id,feature_definition_id' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listing-features', entityType, entityId] });
      toast.success('Features saved');
      setHasChanges(false);
    },
    onError: () => toast.error('Failed to save features'),
  });

  const handleValueChange = (defId: string, value: string) => {
    setFeatureValues(prev => ({ ...prev, [defId]: value }));
    setHasChanges(true);
  };

  const isLoading = loadingDefs || loadingFeatures;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (definitions.length === 0) {
    return null;
  }

  const content = (
    <div className="space-y-3">
      {definitions.map(def => (
        <div key={def.id} className="flex items-center gap-3">
          {def.icon && <span className="text-lg">{def.icon}</span>}
          <div className="flex-1">
            <Label className="text-sm">{def.feature_label}</Label>
            
            {def.feature_type === 'boolean' && (
              <Switch
                checked={featureValues[def.id] === 'true'}
                onCheckedChange={(checked) => handleValueChange(def.id, checked ? 'true' : 'false')}
              />
            )}

            {def.feature_type === 'text' && (
              <Input
                value={featureValues[def.id] || ''}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                placeholder={`Enter ${def.feature_label.toLowerCase()}`}
                className="h-8 text-sm"
              />
            )}

            {def.feature_type === 'number' && (
              <Input
                type="number"
                value={featureValues[def.id] || ''}
                onChange={(e) => handleValueChange(def.id, e.target.value)}
                className="h-8 text-sm w-24"
              />
            )}

            {def.feature_type === 'select' && (
              <Select
                value={featureValues[def.id] || ''}
                onValueChange={(value) => handleValueChange(def.id, value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {def.options?.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      ))}

      {hasChanges && (
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          Save Features
        </Button>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Additional Features
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {content}
      </CardContent>
    </Card>
  );
}

// Display component for showing features on listing cards
export function ListingFeaturesDisplay({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { data: features = [] } = useQuery({
    queryKey: ['listing-features-display', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listing_features')
        .select(`
          feature_value,
          listing_feature_definitions (
            feature_label,
            feature_type,
            icon
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      if (error) throw error;
      return data;
    },
  });

  if (features.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {features.map((f: any, i: number) => {
        const def = f.listing_feature_definitions;
        if (!def) return null;
        
        // For boolean, only show if true
        if (def.feature_type === 'boolean' && f.feature_value !== 'true') return null;

        return (
          <Badge key={i} variant="outline" className="text-xs">
            {def.icon && <span className="mr-1">{def.icon}</span>}
            {def.feature_type === 'boolean' ? def.feature_label : `${def.feature_label}: ${f.feature_value}`}
          </Badge>
        );
      })}
    </div>
  );
}
