import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Gem, TrendingUp, Diamond, Loader2 } from "lucide-react";

interface Setting {
  setting_key: string;
  setting_value: string;
  description: string;
}

export default function TreasureAdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [diamondPrice, setDiamondPrice] = useState("");
  const [gemRatio, setGemRatio] = useState("");
  const [minPurchaseDiamonds, setMinPurchaseDiamonds] = useState("");
  const [minReferrals, setMinReferrals] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("*")
        .in("setting_key", [
          "diamond_base_price",
          "gem_to_diamond_ratio",
          "min_purchase_diamonds_for_earnings",
          "min_referrals_for_earnings",
        ]);

      if (error) throw error;

      setSettings(data || []);
      
      const priceData = data?.find((s) => s.setting_key === "diamond_base_price");
      const ratioData = data?.find((s) => s.setting_key === "gem_to_diamond_ratio");
      const purchaseData = data?.find((s) => s.setting_key === "min_purchase_diamonds_for_earnings");
      const referralData = data?.find((s) => s.setting_key === "min_referrals_for_earnings");
      
      if (priceData) setDiamondPrice(priceData.setting_value);
      if (ratioData) setGemRatio(ratioData.setting_value);
      if (purchaseData) setMinPurchaseDiamonds(purchaseData.setting_value);
      if (referralData) setMinReferrals(referralData.setting_value);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("treasure_admin_settings")
        .upsert([{ setting_key: key, setting_value: value }], { onConflict: "setting_key" });

      if (error) throw error;

      toast.success("Setting updated successfully");
      fetchSettings();
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
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
              <Button onClick={() => handleUpdateSetting("diamond_base_price", diamondPrice)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
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
              <Button onClick={() => handleUpdateSetting("gem_to_diamond_ratio", gemRatio)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Number of gems required to convert to 1 diamond
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Diamond className="w-6 h-6" />
            Earning & Withdrawal Requirements
          </CardTitle>
          <CardDescription>
            Configure requirements for users to earn commissions and withdraw earnings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="minPurchaseDiamonds">
              Minimum Product Purchase Diamonds Required
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="minPurchaseDiamonds"
                type="number"
                min="0"
                value={minPurchaseDiamonds}
                onChange={(e) => setMinPurchaseDiamonds(e.target.value)}
                placeholder="150"
              />
              <Button onClick={() => handleUpdateSetting("min_purchase_diamonds_for_earnings", minPurchaseDiamonds)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total diamonds earned from product purchases needed to qualify for commissions
            </p>
          </div>

          <div>
            <Label htmlFor="minReferrals">
              Minimum Referrals Required
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="minReferrals"
                type="number"
                min="0"
                value={minReferrals}
                onChange={(e) => setMinReferrals(e.target.value)}
                placeholder="2"
              />
              <Button onClick={() => handleUpdateSetting("min_referrals_for_earnings", minReferrals)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Number of affiliate referrals needed to earn commissions at level 5+
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

