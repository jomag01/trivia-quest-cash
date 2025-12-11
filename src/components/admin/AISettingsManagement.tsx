import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, VideoIcon, ImageIcon, Save } from 'lucide-react';

const AISettingsManagement = () => {
  const [freeImageLimit, setFreeImageLimit] = useState('3');
  const [videoCreditCost, setVideoCreditCost] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['ai_free_image_limit', 'ai_video_credit_cost']);

      if (error) throw error;

      data?.forEach(setting => {
        if (setting.key === 'ai_free_image_limit') {
          setFreeImageLimit(setting.value || '3');
        } else if (setting.key === 'ai_video_credit_cost') {
          setVideoCreditCost(setting.value || '10');
        }
      });
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: 'ai_free_image_limit', value: freeImageLimit },
        { key: 'ai_video_credit_cost', value: videoCreditCost }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(update, { onConflict: 'key' });
        
        if (error) throw error;
      }

      toast.success('AI settings saved successfully');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Hub Settings
        </CardTitle>
        <CardDescription>
          Configure AI generation limits and pricing for users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free Image Limit */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Free Image Generations
            </Label>
            <Input
              type="number"
              min="0"
              value={freeImageLimit}
              onChange={(e) => setFreeImageLimit(e.target.value)}
              placeholder="3"
            />
            <p className="text-xs text-muted-foreground">
              Number of free image generations per user before credits are required
            </p>
          </div>

          {/* Video Credit Cost */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <VideoIcon className="h-4 w-4 text-purple-500" />
              Video Generation Cost (Credits)
            </Label>
            <Input
              type="number"
              min="1"
              value={videoCreditCost}
              onChange={(e) => setVideoCreditCost(e.target.value)}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground">
              Number of credits required to generate one video
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/50 border">
          <h4 className="font-medium text-sm mb-2">How it works:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Users get {freeImageLimit} free image generations</li>
            <li>• After free limit, each image costs 1 credit</li>
            <li>• Video generation costs {videoCreditCost} credits per video</li>
            <li>• Users can purchase credits to continue generating</li>
          </ul>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AISettingsManagement;
