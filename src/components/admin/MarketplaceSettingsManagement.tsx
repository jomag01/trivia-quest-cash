import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Save, Store, Loader2, Rocket, Diamond, Gift } from "lucide-react";

const MarketplaceSettingsManagement = () => {
  const [listingFee, setListingFee] = useState("50");
  const [freeListingThreshold, setFreeListingThreshold] = useState("150");
  const [boostPriceStandard, setBoostPriceStandard] = useState("50");
  const [boostPricePremium, setBoostPricePremium] = useState("100");
  const [boostPriceFeatured, setBoostPriceFeatured] = useState("200");
  const [boostDurationDays, setBoostDurationDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_settings")
        .select("*");

      if (error) throw error;

      if (data) {
        data.forEach((setting) => {
          switch (setting.setting_key) {
            case 'listing_fee':
              setListingFee(setting.setting_value || "50");
              break;
            case 'free_listing_diamond_threshold':
              setFreeListingThreshold(setting.setting_value || "150");
              break;
            case 'boost_price_standard':
              setBoostPriceStandard(setting.setting_value || "50");
              break;
            case 'boost_price_premium':
              setBoostPricePremium(setting.setting_value || "100");
              break;
            case 'boost_price_featured':
              setBoostPriceFeatured(setting.setting_value || "200");
              break;
            case 'boost_duration_days':
              setBoostDurationDays(setting.setting_value || "7");
              break;
          }
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load marketplace settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settings = [
        { setting_key: "listing_fee", setting_value: listingFee },
        { setting_key: "free_listing_diamond_threshold", setting_value: freeListingThreshold },
        { setting_key: "boost_price_standard", setting_value: boostPriceStandard },
        { setting_key: "boost_price_premium", setting_value: boostPricePremium },
        { setting_key: "boost_price_featured", setting_value: boostPriceFeatured },
        { setting_key: "boost_duration_days", setting_value: boostDurationDays },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from("marketplace_settings")
          .upsert({
            ...setting,
            updated_at: new Date().toISOString(),
          }, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("Marketplace settings saved!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Marketplace Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Listing Fee Section */}
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Listing Fee (₱)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Amount users must pay to reveal their contact details to buyers.
              </p>
              <Input
                type="number"
                value={listingFee}
                onChange={(e) => setListingFee(e.target.value)}
                placeholder="50"
                className="max-w-xs"
              />
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                Free Listing Threshold (Diamonds)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Users with this many diamonds get FREE listings (contact visible immediately).
              </p>
              <Input
                type="number"
                value={freeListingThreshold}
                onChange={(e) => setFreeListingThreshold(e.target.value)}
                placeholder="150"
                className="max-w-xs"
              />
            </div>
          </div>

          <Separator />

          {/* Boost Pricing Section */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Boost/Promoted Listing Pricing
            </h4>
            <p className="text-sm text-muted-foreground">
              Sellers can pay to boost their listings for increased visibility across feeds, search results, and marketplace pages.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-blue-500" />
                  Standard Boost (Diamonds)
                </Label>
                <Input
                  type="number"
                  value={boostPriceStandard}
                  onChange={(e) => setBoostPriceStandard(e.target.value)}
                  placeholder="50"
                />
                <p className="text-xs text-muted-foreground mt-1">Basic visibility boost</p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-purple-500" />
                  Premium Boost (Diamonds)
                </Label>
                <Input
                  type="number"
                  value={boostPricePremium}
                  onChange={(e) => setBoostPricePremium(e.target.value)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground mt-1">Higher visibility + feed priority</p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Diamond className="w-4 h-4 text-amber-500" />
                  Featured Boost (Diamonds)
                </Label>
                <Input
                  type="number"
                  value={boostPriceFeatured}
                  onChange={(e) => setBoostPriceFeatured(e.target.value)}
                  placeholder="200"
                />
                <p className="text-xs text-muted-foreground mt-1">Top placement + featured badge</p>
              </div>
            </div>

            <div>
              <Label>Boost Duration (Days)</Label>
              <Input
                type="number"
                value={boostDurationDays}
                onChange={(e) => setBoostDurationDays(e.target.value)}
                placeholder="7"
                className="max-w-xs"
              />
            </div>
          </div>

          <Separator />

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-medium">Revenue Model:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Listing Fee:</strong> ₱{listingFee} to reveal contact details</li>
              <li>• <strong>Free Listings:</strong> Users with {freeListingThreshold}+ diamonds skip the fee</li>
              <li>• <strong>Boost Pricing:</strong> Standard ({boostPriceStandard}💎), Premium ({boostPricePremium}💎), Featured ({boostPriceFeatured}💎)</li>
              <li>• <strong>Commission Integration:</strong> Listing fees contribute to Unilevel, Stair-step, and Leadership commissions</li>
            </ul>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketplaceSettingsManagement;
