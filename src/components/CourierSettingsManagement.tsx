import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";

interface CourierConfig {
  courier_name: string;
  display_name: string;
  is_enabled: boolean;
  has_api_key: boolean;
}

const AVAILABLE_COURIERS = [
  { name: 'ninja_van', display: 'Ninja Van', icon: '🥷' },
  { name: 'jnt', display: 'J&T Express', icon: '📦' },
  { name: 'lbc', display: 'LBC', icon: '🚚' },
  { name: 'flash_express', display: 'Flash Express', icon: '⚡' },
];

export default function CourierSettingsManagement() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [couriers, setCouriers] = useState<CourierConfig[]>([]);

  useEffect(() => {
    fetchCourierSettings();
  }, []);

  const fetchCourierSettings = async () => {
    try {
      setLoading(true);
      
      // Check for existing courier settings in treasure_admin_settings
      const { data: settings, error } = await supabase
        .from('treasure_admin_settings')
        .select('*')
        .like('setting_key', 'courier_%');

      if (error) throw error;

      const courierConfigs = AVAILABLE_COURIERS.map(courier => {
        const enabledSetting = settings?.find(s => s.setting_key === `courier_${courier.name}_enabled`);
        
        return {
          courier_name: courier.name,
          display_name: courier.display,
          is_enabled: enabledSetting?.setting_value === 'true',
          has_api_key: false // We don't expose API key status for security
        };
      });

      setCouriers(courierConfigs);
    } catch (error: any) {
      console.error('Error fetching courier settings:', error);
      toast.error('Failed to load courier settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourier = async (courierName: string, currentEnabled: boolean) => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('treasure_admin_settings')
        .upsert({
          setting_key: `courier_${courierName}_enabled`,
          setting_value: (!currentEnabled).toString(),
          description: `Enable/disable ${courierName} courier integration`
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;

      setCouriers(prev => prev.map(c => 
        c.courier_name === courierName 
          ? { ...c, is_enabled: !currentEnabled }
          : c
      ));

      toast.success(`${courierName} ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      console.error('Error updating courier:', error);
      toast.error('Failed to update courier settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Courier Integration Settings
          </CardTitle>
          <CardDescription>
            Enable or disable courier providers for real-time shipping rate calculation. 
            Disabled couriers will fall back to zone-based rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {couriers.map(courier => (
            <div 
              key={courier.courier_name}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {AVAILABLE_COURIERS.find(c => c.name === courier.courier_name)?.icon}
                </span>
                <div>
                  <Label htmlFor={courier.courier_name} className="text-base font-medium">
                    {courier.display_name}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {courier.is_enabled ? 'Active - Using real-time rates' : 'Inactive - Using zone rates'}
                  </p>
                </div>
              </div>
              <Switch
                id={courier.courier_name}
                checked={courier.is_enabled}
                onCheckedChange={() => toggleCourier(courier.courier_name, courier.is_enabled)}
                disabled={saving}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Key Configuration</CardTitle>
          <CardDescription>
            To use real-time courier rates, API keys must be configured in your backend settings.
            Contact your system administrator to set up courier API keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Required API Keys:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>NINJA_VAN_API_KEY - For Ninja Van integration</li>
              <li>JT_EXPRESS_API_KEY - For J&T Express integration</li>
              <li>LBC_API_KEY - For LBC integration</li>
              <li>FLASH_EXPRESS_API_KEY - For Flash Express integration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
