import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Store, Link, ExternalLink, Save, Crown } from "lucide-react";

interface ShopShowcase {
  id: string;
  shop_name: string | null;
  shop_url: string | null;
  description: string | null;
  is_active: boolean;
}

interface BeesMateShopShowcaseProps {
  canShowcase: boolean;
  onUpgradeClick: () => void;
}

export function BeesMateShopShowcase({ canShowcase, onUpgradeClick }: BeesMateShopShowcaseProps) {
  const { user } = useAuth();
  const [showcase, setShowcase] = useState<ShopShowcase>({
    id: '',
    shop_name: '',
    shop_url: '',
    description: '',
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchShowcase();
  }, [user]);

  const fetchShowcase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('beesmate_shop_showcase')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setShowcase({
          id: data.id,
          shop_name: data.shop_name || '',
          shop_url: data.shop_url || '',
          description: data.description || '',
          is_active: data.is_active ?? true
        });
      }
    } catch (error) {
      console.error('Error fetching showcase:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveShowcase = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      if (showcase.id) {
        await supabase
          .from('beesmate_shop_showcase')
          .update({
            shop_name: showcase.shop_name,
            shop_url: showcase.shop_url,
            description: showcase.description,
            is_active: showcase.is_active
          })
          .eq('id', showcase.id);
      } else {
        const { data } = await supabase
          .from('beesmate_shop_showcase')
          .insert({
            user_id: user.id,
            shop_name: showcase.shop_name,
            shop_url: showcase.shop_url,
            description: showcase.description,
            is_active: showcase.is_active
          })
          .select()
          .single();

        if (data) {
          setShowcase(prev => ({ ...prev, id: data.id }));
        }
      }

      toast.success('Shop showcase saved!');
    } catch (error) {
      console.error('Error saving showcase:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!canShowcase) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white mx-auto flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Shop Showcase</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade to Pro to showcase your shop or products on your profile
              </p>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-600"
              onClick={onUpgradeClick}
            >
              <Crown className="w-4 h-4 mr-2" />
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Store className="w-5 h-5" />
          Shop Showcase
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Show on Profile</Label>
            <p className="text-xs text-muted-foreground">Display your shop to other users</p>
          </div>
          <Switch
            checked={showcase.is_active}
            onCheckedChange={(checked) => setShowcase(prev => ({ ...prev, is_active: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Shop Name</Label>
          <Input
            placeholder="My Awesome Shop"
            value={showcase.shop_name || ''}
            onChange={(e) => setShowcase(prev => ({ ...prev, shop_name: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Shop URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="https://your-shop.com"
                value={showcase.shop_url || ''}
                onChange={(e) => setShowcase(prev => ({ ...prev, shop_url: e.target.value }))}
              />
            </div>
            {showcase.shop_url && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => window.open(showcase.shop_url!, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Tell people about your shop..."
            value={showcase.description || ''}
            onChange={(e) => setShowcase(prev => ({ ...prev, description: e.target.value }))}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">
            {(showcase.description?.length || 0)}/200
          </p>
        </div>

        <Button 
          className="w-full" 
          onClick={saveShowcase}
          disabled={saving}
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Showcase
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}