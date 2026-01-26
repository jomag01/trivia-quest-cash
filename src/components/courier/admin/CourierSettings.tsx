import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Truck, Wallet, MapPin, Bell } from "lucide-react";

const CourierSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["courier-settings"],
    queryFn: async () => {
      // Default settings - in production these would come from a settings table
      return {
        defaultCODFeePercent: 2.0,
        defaultCODFeeMinimum: 25,
        defaultInsurancePercent: 1.0,
        volumetricDivisor: 6000,
        maxCashLimit: 50000,
        autoAssignRiders: true,
        requirePhotoProof: true,
        enableSMSNotifications: true,
        enablePushNotifications: true,
      };
    },
  });

  const [localSettings, setLocalSettings] = useState(settings);

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      // Save settings logic would go here
      return newSettings;
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Pricing & Fees
          </CardTitle>
          <CardDescription>Configure default pricing rules for COD and shipping</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>COD Fee Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                defaultValue={settings?.defaultCODFeePercent}
                placeholder="2.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum COD Fee (₱)</Label>
              <Input
                type="number"
                defaultValue={settings?.defaultCODFeeMinimum}
                placeholder="25"
              />
            </div>
            <div className="space-y-2">
              <Label>Insurance Percentage (%)</Label>
              <Input
                type="number"
                step="0.1"
                defaultValue={settings?.defaultInsurancePercent}
                placeholder="1.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Volumetric Divisor</Label>
              <Input
                type="number"
                defaultValue={settings?.volumetricDivisor}
                placeholder="6000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rider Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rider Settings
          </CardTitle>
          <CardDescription>Configure rider-related settings and limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Maximum Cash Limit (₱)</Label>
              <Input
                type="number"
                defaultValue={settings?.maxCashLimit}
                placeholder="50000"
              />
              <p className="text-xs text-muted-foreground">
                Maximum COD amount a rider can hold before mandatory turnover
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-assign Riders</Label>
              <p className="text-xs text-muted-foreground">
                Automatically assign delivery jobs to available riders
              </p>
            </div>
            <Switch defaultChecked={settings?.autoAssignRiders} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Photo Proof</Label>
              <p className="text-xs text-muted-foreground">
                Require riders to take photos as proof of delivery
              </p>
            </div>
            <Switch defaultChecked={settings?.requirePhotoProof} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>SMS Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send SMS updates to customers about their shipments
              </p>
            </div>
            <Switch defaultChecked={settings?.enableSMSNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send push notifications to riders and customers
              </p>
            </div>
            <Switch defaultChecked={settings?.enablePushNotifications} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveSettingsMutation.mutate(localSettings)}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default CourierSettings;
