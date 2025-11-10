import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Gem, TrendingUp } from "lucide-react";

interface Setting {
  setting_key: string;
  setting_value: string;
  description: string;
}

export default function TreasureAdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [diamondPrice, setDiamondPrice] = useState("");
  const [gemRatio, setGemRatio] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("*")
        .in("setting_key", ["diamond_base_price", "gem_to_diamond_ratio"]);

      if (error) throw error;

      setSettings(data || []);
      
      const priceData = data?.find((s) => s.setting_key === "diamond_base_price");
      const ratioData = data?.find((s) => s.setting_key === "gem_to_diamond_ratio");
      
      if (priceData) setDiamondPrice(priceData.setting_value);
      if (ratioData) setGemRatio(ratioData.setting_value);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from("treasure_admin_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);

      if (error) throw error;

      toast.success("Setting updated successfully");
      fetchSettings();
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Settings className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gem className="w-6 h-6" />
            Diamond Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="diamondPrice">Base Price per Diamond (₱)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="diamondPrice"
                type="number"
                step="0.01"
                min="0.01"
                value={diamondPrice}
                onChange={(e) => setDiamondPrice(e.target.value)}
                placeholder="10.00"
              />
              <Button onClick={() => handleUpdateSetting("diamond_base_price", diamondPrice)}>
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This is the suggested price for diamonds in the marketplace
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Gem Conversion Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="gemRatio">Gems to Diamond Conversion Ratio</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="gemRatio"
                type="number"
                min="1"
                value={gemRatio}
                onChange={(e) => setGemRatio(e.target.value)}
                placeholder="100"
              />
              <Button onClick={() => handleUpdateSetting("gem_to_diamond_ratio", gemRatio)}>
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Number of gems needed to convert to 1 diamond (e.g., 100 gems = 1 diamond)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Settings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {settings.map((setting) => (
              <div key={setting.setting_key} className="p-3 bg-secondary/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold capitalize">
                      {setting.setting_key.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm text-muted-foreground">{setting.description}</div>
                  </div>
                  <div className="text-lg font-bold">{setting.setting_value}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
