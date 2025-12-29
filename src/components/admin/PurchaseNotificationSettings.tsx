import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Bell, Save, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NotificationSettings {
  id: string;
  is_enabled: boolean;
  show_interval_seconds: number;
  pause_duration_seconds: number;
  notifications_per_cycle: number;
  show_fake_notifications: boolean;
  fake_product_names: string[];
  fake_ai_packages: string[];
}

export const PurchaseNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [newAiPackage, setNewAiPackage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('purchase_notification_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettings(data as NotificationSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { error } = await supabase
      .from('purchase_notification_settings')
      .update({
        is_enabled: settings.is_enabled,
        show_interval_seconds: settings.show_interval_seconds,
        pause_duration_seconds: settings.pause_duration_seconds,
        notifications_per_cycle: settings.notifications_per_cycle,
        show_fake_notifications: settings.show_fake_notifications,
        fake_product_names: settings.fake_product_names,
        fake_ai_packages: settings.fake_ai_packages,
        updated_at: new Date().toISOString()
      })
      .eq('id', settings.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Settings saved successfully' });
    }
    setSaving(false);
  };

  const addProduct = () => {
    if (!newProduct.trim() || !settings) return;
    setSettings({
      ...settings,
      fake_product_names: [...settings.fake_product_names, newProduct.trim()]
    });
    setNewProduct('');
  };

  const removeProduct = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      fake_product_names: settings.fake_product_names.filter((_, i) => i !== index)
    });
  };

  const addAiPackage = () => {
    if (!newAiPackage.trim() || !settings) return;
    setSettings({
      ...settings,
      fake_ai_packages: [...settings.fake_ai_packages, newAiPackage.trim()]
    });
    setNewAiPackage('');
  };

  const removeAiPackage = (index: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      fake_ai_packages: settings.fake_ai_packages.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading...</div>;
  }

  if (!settings) {
    return <div className="p-4 text-center text-muted-foreground">No settings found</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Purchase Notification Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Enable Notifications</Label>
            <p className="text-sm text-muted-foreground">Show purchase pop-ups to visitors</p>
          </div>
          <Switch
            checked={settings.is_enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, is_enabled: checked })}
          />
        </div>

        {/* Show Fake Notifications */}
        <div className="flex items-center justify-between">
          <div>
            <Label>Show Fake Notifications</Label>
            <p className="text-sm text-muted-foreground">Display simulated purchases when no real ones</p>
          </div>
          <Switch
            checked={settings.show_fake_notifications}
            onCheckedChange={(checked) => setSettings({ ...settings, show_fake_notifications: checked })}
          />
        </div>

        {/* Timing Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Show Interval (seconds)</Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={settings.show_interval_seconds}
              onChange={(e) => setSettings({ ...settings, show_interval_seconds: parseInt(e.target.value) || 15 })}
            />
            <p className="text-xs text-muted-foreground">Time between notifications</p>
          </div>

          <div className="space-y-2">
            <Label>Notifications Per Cycle</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={settings.notifications_per_cycle}
              onChange={(e) => setSettings({ ...settings, notifications_per_cycle: parseInt(e.target.value) || 5 })}
            />
            <p className="text-xs text-muted-foreground">Number before pause</p>
          </div>

          <div className="space-y-2">
            <Label>Pause Duration (seconds)</Label>
            <Input
              type="number"
              min={10}
              max={300}
              value={settings.pause_duration_seconds}
              onChange={(e) => setSettings({ ...settings, pause_duration_seconds: parseInt(e.target.value) || 60 })}
            />
            <p className="text-xs text-muted-foreground">Rest period after cycle</p>
          </div>
        </div>

        {/* Fake Product Names */}
        <div className="space-y-3">
          <Label>Fake Product Names</Label>
          <div className="flex flex-wrap gap-2">
            {settings.fake_product_names.map((name, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {name}
                <button onClick={() => removeProduct(index)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add product name..."
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addProduct()}
            />
            <Button onClick={addProduct} size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Fake AI Package Names */}
        <div className="space-y-3">
          <Label>Fake AI Package Names</Label>
          <div className="flex flex-wrap gap-2">
            {settings.fake_ai_packages.map((name, index) => (
              <Badge key={index} variant="secondary" className="gap-1 bg-purple-500/10 text-purple-600">
                {name}
                <button onClick={() => removeAiPackage(index)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add AI package name..."
              value={newAiPackage}
              onChange={(e) => setNewAiPackage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAiPackage()}
            />
            <Button onClick={addAiPackage} size="icon" variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
