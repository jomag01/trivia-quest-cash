import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Save, Store, Loader2 } from "lucide-react";

const MarketplaceSettingsManagement = () => {
  const [listingFee, setListingFee] = useState("50");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_settings")
        .select("*")
        .eq("setting_key", "listing_fee")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setListingFee(data.setting_value || "50");
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
      const { error } = await supabase
        .from("marketplace_settings")
        .upsert({
          setting_key: "listing_fee",
          setting_value: listingFee,
          updated_at: new Date().toISOString(),
        }, { onConflict: "setting_key" });

      if (error) throw error;

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
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Listing Fee (₱)
              </Label>
              <p className="text-sm text-muted-foreground mb-2">
                Amount users must pay to reveal their contact details to buyers.
                Until paid, email and phone are hidden from potential buyers.
              </p>
              <Input
                type="number"
                value={listingFee}
                onChange={(e) => setListingFee(e.target.value)}
                placeholder="50"
                className="max-w-xs"
              />
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">How it works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sellers add their email and phone when posting a listing</li>
                <li>• Contact details are hidden from buyers until listing fee is paid</li>
                <li>• After payment, buyers can see seller's email and phone</li>
                <li>• Current fee: <Badge variant="secondary">₱{listingFee}</Badge></li>
              </ul>
            </div>
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
