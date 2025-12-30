import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, RefreshCw, Edit, Save, X, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProviderPricing {
  id: string;
  provider_name: string;
  model_name: string;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  image_cost: number;
  video_cost_per_second: number;
  audio_cost_per_minute: number;
  notes: string;
}

const AIProviderPricing = () => {
  const [pricing, setPricing] = useState<ProviderPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProviderPricing>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('ai_provider_pricing')
        .select('*')
        .order('provider_name', { ascending: true });

      if (error) throw error;
      setPricing(data || []);
      if (isRefresh) toast.success('Pricing updated successfully');
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load AI provider pricing');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const startEdit = (item: ProviderPricing) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      const { error } = await supabase
        .from('ai_provider_pricing')
        .update({
          input_cost_per_1k: editForm.input_cost_per_1k,
          output_cost_per_1k: editForm.output_cost_per_1k,
          image_cost: editForm.image_cost,
          video_cost_per_second: editForm.video_cost_per_second,
          audio_cost_per_minute: editForm.audio_cost_per_minute,
          notes: editForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;
      
      toast.success('Pricing updated');
      setEditingId(null);
      setEditForm({});
      fetchPricing();
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast.error('Failed to save pricing');
    }
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '-';
    if (value < 0.01) return `$${value.toFixed(6)}`;
    return `$${value.toFixed(4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Mobile Card View
  const MobileCardView = ({ item }: { item: ProviderPricing }) => {
    const isEditing = editingId === item.id;

    return (
      <Card className="mb-3">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">{item.provider_name}</Badge>
            {!isEditing ? (
              <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-7 w-7">
                <Edit className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7">
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <p className="font-mono text-xs text-muted-foreground break-all">{item.model_name}</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Input/1K</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={editForm.input_cost_per_1k || 0}
                  onChange={(e) => setEditForm({ ...editForm, input_cost_per_1k: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Output/1K</Label>
                <Input
                  type="number"
                  step="0.000001"
                  value={editForm.output_cost_per_1k || 0}
                  onChange={(e) => setEditForm({ ...editForm, output_cost_per_1k: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Per Image</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editForm.image_cost || 0}
                  onChange={(e) => setEditForm({ ...editForm, image_cost: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Video/sec</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={editForm.video_cost_per_second || 0}
                  onChange={(e) => setEditForm({ ...editForm, video_cost_per_second: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Audio/min</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.audio_cost_per_minute || 0}
                  onChange={(e) => setEditForm({ ...editForm, audio_cost_per_minute: parseFloat(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Notes</Label>
                <Input
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input/1K:</span>
                <span className="font-medium">{formatCurrency(item.input_cost_per_1k)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output/1K:</span>
                <span className="font-medium">{formatCurrency(item.output_cost_per_1k)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Image:</span>
                <span className="font-medium">{formatCurrency(item.image_cost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Video/s:</span>
                <span className="font-medium">{formatCurrency(item.video_cost_per_second)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Audio/m:</span>
                <span className="font-medium">{formatCurrency(item.audio_cost_per_minute)}</span>
              </div>
              {item.notes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Notes: </span>
                  <span className="font-medium">{item.notes}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Desktop Table View
  const DesktopTableView = () => (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">Provider</th>
            <th className="text-left p-3 font-medium">Model</th>
            <th className="text-left p-3 font-medium whitespace-nowrap">Input/1K</th>
            <th className="text-left p-3 font-medium whitespace-nowrap">Output/1K</th>
            <th className="text-left p-3 font-medium whitespace-nowrap">Image</th>
            <th className="text-left p-3 font-medium whitespace-nowrap">Video/s</th>
            <th className="text-left p-3 font-medium whitespace-nowrap">Audio/m</th>
            <th className="text-left p-3 font-medium">Notes</th>
            <th className="text-left p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pricing.map((item) => (
            <tr key={item.id} className="border-b">
              <td className="p-3">
                <Badge variant="outline" className="text-xs">{item.provider_name}</Badge>
              </td>
              <td className="p-3 font-mono text-xs max-w-[150px] truncate">{item.model_name}</td>
              {editingId === item.id ? (
                <>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.000001"
                      value={editForm.input_cost_per_1k || 0}
                      onChange={(e) => setEditForm({ ...editForm, input_cost_per_1k: parseFloat(e.target.value) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.000001"
                      value={editForm.output_cost_per_1k || 0}
                      onChange={(e) => setEditForm({ ...editForm, output_cost_per_1k: parseFloat(e.target.value) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.0001"
                      value={editForm.image_cost || 0}
                      onChange={(e) => setEditForm({ ...editForm, image_cost: parseFloat(e.target.value) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.0001"
                      value={editForm.video_cost_per_second || 0}
                      onChange={(e) => setEditForm({ ...editForm, video_cost_per_second: parseFloat(e.target.value) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.audio_cost_per_minute || 0}
                      onChange={(e) => setEditForm({ ...editForm, audio_cost_per_minute: parseFloat(e.target.value) })}
                      className="w-20 h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={editForm.notes || ''}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-28 h-8 text-xs"
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7">
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-3 text-xs">{formatCurrency(item.input_cost_per_1k)}</td>
                  <td className="p-3 text-xs">{formatCurrency(item.output_cost_per_1k)}</td>
                  <td className="p-3 text-xs">{formatCurrency(item.image_cost)}</td>
                  <td className="p-3 text-xs">{formatCurrency(item.video_cost_per_second)}</td>
                  <td className="p-3 text-xs">{formatCurrency(item.audio_cost_per_minute)}</td>
                  <td className="p-3 text-xs text-muted-foreground max-w-[120px] truncate">
                    {item.notes}
                  </td>
                  <td className="p-3">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-7 w-7">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                AI Provider Pricing Reference
              </CardTitle>
              <CardDescription>
                Track what you're charged by AI providers to set appropriate pricing for users
              </CardDescription>
            </div>
            <Button 
              onClick={() => fetchPricing(true)} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Updating...' : 'Refresh Prices'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="space-y-3">
              {pricing.map((item) => (
                <MobileCardView key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <DesktopTableView />
          )}

          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">How to use this pricing info:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>These are the costs YOU pay to AI providers per API call</li>
                  <li>Use this to calculate your markup when setting credit prices</li>
                  <li>Example: If image costs $0.02 and you charge 1 credit, ensure credit price covers this + profit</li>
                  <li>Update these values when providers change their pricing</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
};

export default AIProviderPricing;