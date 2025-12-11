import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, RefreshCw, Edit, Save, X, Info } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProviderPricing>>({});

  useEffect(() => {
    fetchPricing();
  }, []);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_provider_pricing')
        .select('*')
        .order('provider_name', { ascending: true });

      if (error) throw error;
      setPricing(data || []);
    } catch (error) {
      console.error('Error fetching pricing:', error);
      toast.error('Failed to load AI provider pricing');
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            AI Provider Pricing Reference
          </CardTitle>
          <CardDescription>
            Track what you're charged by AI providers to set appropriate pricing for users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Input/1K tokens</TableHead>
                  <TableHead>Output/1K tokens</TableHead>
                  <TableHead>Per Image</TableHead>
                  <TableHead>Video/sec</TableHead>
                  <TableHead>Audio/min</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricing.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.provider_name}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.model_name}</TableCell>
                    {editingId === item.id ? (
                      <>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.000001"
                            value={editForm.input_cost_per_1k || 0}
                            onChange={(e) => setEditForm({ ...editForm, input_cost_per_1k: parseFloat(e.target.value) })}
                            className="w-24 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.000001"
                            value={editForm.output_cost_per_1k || 0}
                            onChange={(e) => setEditForm({ ...editForm, output_cost_per_1k: parseFloat(e.target.value) })}
                            className="w-24 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.0001"
                            value={editForm.image_cost || 0}
                            onChange={(e) => setEditForm({ ...editForm, image_cost: parseFloat(e.target.value) })}
                            className="w-24 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.0001"
                            value={editForm.video_cost_per_second || 0}
                            onChange={(e) => setEditForm({ ...editForm, video_cost_per_second: parseFloat(e.target.value) })}
                            className="w-24 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={editForm.audio_cost_per_minute || 0}
                            onChange={(e) => setEditForm({ ...editForm, audio_cost_per_minute: parseFloat(e.target.value) })}
                            className="w-24 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.notes || ''}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            className="w-32 h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={saveEdit} className="h-7 w-7">
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-7 w-7">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-xs">{formatCurrency(item.input_cost_per_1k)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.output_cost_per_1k)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.image_cost)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.video_cost_per_second)}</TableCell>
                        <TableCell className="text-xs">{formatCurrency(item.audio_cost_per_minute)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {item.notes}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => startEdit(item)} className="h-7 w-7">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
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

      <Button onClick={fetchPricing} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Refresh Pricing
      </Button>
    </div>
  );
};

export default AIProviderPricing;
