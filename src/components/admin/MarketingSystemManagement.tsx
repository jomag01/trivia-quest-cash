import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Settings, Plus, Pencil, Trash2, Loader2, Power, PowerOff,
  GitBranch, Network, TrendingUp, Crown, Users, Sparkles, Save,
  AlertTriangle, CheckCircle
} from 'lucide-react';

interface MarketingSystem {
  id: string;
  system_key: string;
  system_name: string;
  description: string | null;
  is_enabled: boolean;
  icon: string | null;
  display_order: number;
}

const ICON_OPTIONS = [
  { value: 'GitBranch', label: 'Binary Tree', icon: GitBranch },
  { value: 'Network', label: 'Network', icon: Network },
  { value: 'TrendingUp', label: 'Trending Up', icon: TrendingUp },
  { value: 'Crown', label: 'Crown', icon: Crown },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
];

const getIconComponent = (iconName: string | null) => {
  const iconMap: Record<string, any> = {
    GitBranch, Network, TrendingUp, Crown, Users, Sparkles
  };
  return iconMap[iconName || ''] || Network;
};

export default function MarketingSystemManagement() {
  const [systems, setSystems] = useState<MarketingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSystem, setEditingSystem] = useState<MarketingSystem | null>(null);

  const [form, setForm] = useState({
    system_key: '',
    system_name: '',
    description: '',
    icon: 'Network',
    display_order: 0
  });

  useEffect(() => {
    fetchSystems();
  }, []);

  const fetchSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_systems')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setSystems(data || []);
    } catch (error) {
      console.error('Error fetching systems:', error);
      toast.error('Failed to load marketing systems');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (system: MarketingSystem) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('marketing_systems')
        .update({ is_enabled: !system.is_enabled, updated_at: new Date().toISOString() })
        .eq('id', system.id);

      if (error) throw error;

      setSystems(prev => prev.map(s => 
        s.id === system.id ? { ...s, is_enabled: !s.is_enabled } : s
      ));

      toast.success(`${system.system_name} ${!system.is_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling system:', error);
      toast.error('Failed to update system');
    } finally {
      setSaving(false);
    }
  };

  const openAddDialog = () => {
    setEditingSystem(null);
    setForm({
      system_key: '',
      system_name: '',
      description: '',
      icon: 'Network',
      display_order: systems.length
    });
    setShowAddDialog(true);
  };

  const openEditDialog = (system: MarketingSystem) => {
    setEditingSystem(system);
    setForm({
      system_key: system.system_key,
      system_name: system.system_name,
      description: system.description || '',
      icon: system.icon || 'Network',
      display_order: system.display_order
    });
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!form.system_key || !form.system_name) {
      toast.error('System key and name are required');
      return;
    }

    setSaving(true);
    try {
      if (editingSystem) {
        const { error } = await supabase
          .from('marketing_systems')
          .update({
            system_name: form.system_name,
            description: form.description || null,
            icon: form.icon,
            display_order: form.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSystem.id);

        if (error) throw error;
        toast.success('System updated successfully');
      } else {
        const { error } = await supabase
          .from('marketing_systems')
          .insert({
            system_key: form.system_key.toLowerCase().replace(/\s+/g, '_'),
            system_name: form.system_name,
            description: form.description || null,
            icon: form.icon,
            display_order: form.display_order,
            is_enabled: true
          });

        if (error) throw error;
        toast.success('System added successfully');
      }

      setShowAddDialog(false);
      fetchSystems();
    } catch (error: any) {
      console.error('Error saving system:', error);
      toast.error(error.message || 'Failed to save system');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (system: MarketingSystem) => {
    if (!confirm(`Are you sure you want to delete "${system.system_name}"? This cannot be undone.`)) return;

    try {
      const { error } = await supabase
        .from('marketing_systems')
        .delete()
        .eq('id', system.id);

      if (error) throw error;
      toast.success('System deleted');
      fetchSystems();
    } catch (error) {
      console.error('Error deleting system:', error);
      toast.error('Failed to delete system');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const enabledCount = systems.filter(s => s.is_enabled).length;
  const disabledCount = systems.filter(s => !s.is_enabled).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Marketing System Management
              </CardTitle>
              <CardDescription>
                Enable, disable, or add marketing/MLM systems. Disabled systems won't appear anywhere in the app.
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add System
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className="text-2xl font-bold">{systems.length}</div>
              <div className="text-xs text-muted-foreground">Total Systems</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-2xl font-bold text-green-500">{enabledCount}</div>
              <div className="text-xs text-muted-foreground">Enabled</div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <div className="text-2xl font-bold text-red-500">{disabledCount}</div>
              <div className="text-xs text-muted-foreground">Disabled</div>
            </div>
          </div>

          {/* Systems List */}
          <div className="space-y-2">
            {systems.map(system => {
              const IconComponent = getIconComponent(system.icon);
              return (
                <div
                  key={system.id}
                  className={`p-4 rounded-lg border transition-all ${
                    system.is_enabled
                      ? 'bg-card border-green-500/30'
                      : 'bg-muted/30 border-muted opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${system.is_enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <IconComponent className={`h-5 w-5 ${system.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{system.system_name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {system.system_key}
                          </Badge>
                          {system.is_enabled ? (
                            <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Disabled
                            </Badge>
                          )}
                        </div>
                        {system.description && (
                          <p className="text-xs text-muted-foreground mt-1">{system.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={system.is_enabled}
                        onCheckedChange={() => handleToggle(system)}
                        disabled={saving}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(system)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(system)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {systems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No marketing systems configured</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First System
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSystem ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingSystem ? 'Edit System' : 'Add New Marketing System'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Key *</Label>
                <Input
                  value={form.system_key}
                  onChange={(e) => setForm({ ...form, system_key: e.target.value })}
                  placeholder="e.g., binary, unilevel"
                  disabled={!!editingSystem}
                />
                <p className="text-xs text-muted-foreground">Unique identifier (cannot be changed)</p>
              </div>
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  value={form.system_name}
                  onChange={(e) => setForm({ ...form, system_name: e.target.value })}
                  placeholder="e.g., AI Beehives"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this marketing system"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {opt.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Save className="h-4 w-4 mr-1" />
                {editingSystem ? 'Update' : 'Add System'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
