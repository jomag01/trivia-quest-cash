import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings2, Percent, DollarSign, Eye, Users } from "lucide-react";

interface ListingSettings {
  id?: string;
  listing_type: string;
  min_budget: number;
  max_budget: number;
  min_duration_days: number;
  max_duration_days: number;
  boost_multiplier: number;
  enable_affiliate_commissions: boolean;
  unilevel_percentage: number;
  stairstep_percentage: number;
  leadership_percentage: number;
  referrer_commission_percentage: number;
  cost_per_impression: number;
  min_impressions_per_day: number;
  max_impressions_per_day: number;
  instructions: string;
}

const defaultSettings: Omit<ListingSettings, 'listing_type'> = {
  min_budget: 100,
  max_budget: 100000,
  min_duration_days: 1,
  max_duration_days: 90,
  boost_multiplier: 2.0,
  enable_affiliate_commissions: true,
  unilevel_percentage: 40,
  stairstep_percentage: 35,
  leadership_percentage: 25,
  referrer_commission_percentage: 10,
  cost_per_impression: 0.10,
  min_impressions_per_day: 50,
  max_impressions_per_day: 5000,
  instructions: "Pay to GCash: 09XX-XXX-XXXX. Upload screenshot as proof."
};

const listingTypes = [
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'auction', label: 'Auctions' },
  { key: 'food_item', label: 'Food Items' }
];

export default function SponsoredListingsSettings() {
  const [activeType, setActiveType] = useState("marketplace");
  const [settings, setSettings] = useState<Record<string, ListingSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sponsored_listing_settings")
        .select("*");
      
      if (error) throw error;

      const settingsMap: Record<string, ListingSettings> = {};
      listingTypes.forEach(type => {
        const existing = data?.find(s => s.listing_type === type.key);
        settingsMap[type.key] = existing || { ...defaultSettings, listing_type: type.key };
      });
      setSettings(settingsMap);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: string) => {
    setSaving(true);
    try {
      const current = settings[type];
      
      // Validate commission percentages
      const totalCommission = current.unilevel_percentage + current.stairstep_percentage + current.leadership_percentage;
      if (current.enable_affiliate_commissions && totalCommission > 100) {
        toast.error("Total commission percentages cannot exceed 100%");
        return;
      }

      if (current.id) {
        const { error } = await supabase
          .from("sponsored_listing_settings")
          .update({
            min_budget: current.min_budget,
            max_budget: current.max_budget,
            min_duration_days: current.min_duration_days,
            max_duration_days: current.max_duration_days,
            boost_multiplier: current.boost_multiplier,
            enable_affiliate_commissions: current.enable_affiliate_commissions,
            unilevel_percentage: current.unilevel_percentage,
            stairstep_percentage: current.stairstep_percentage,
            leadership_percentage: current.leadership_percentage,
            referrer_commission_percentage: current.referrer_commission_percentage,
            cost_per_impression: current.cost_per_impression,
            min_impressions_per_day: current.min_impressions_per_day,
            max_impressions_per_day: current.max_impressions_per_day,
            instructions: current.instructions
          })
          .eq("id", current.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sponsored_listing_settings")
          .insert({
            listing_type: type,
            ...current
          });
        if (error) throw error;
      }

      toast.success("Settings saved successfully");
      fetchAllSettings();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (type: string, key: keyof ListingSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const current = settings[activeType];
  const adminProfit = current?.enable_affiliate_commissions 
    ? 100 - (current.referrer_commission_percentage || 0) - ((100 - (current.referrer_commission_percentage || 0)) * (current.unilevel_percentage + current.stairstep_percentage + current.leadership_percentage) / 100)
    : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Sponsored Listings Settings
        </CardTitle>
        <CardDescription>
          Configure pricing, commissions, and delivery settings for sponsored ads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeType} onValueChange={setActiveType}>
          <TabsList className="mb-6">
            {listingTypes.map(type => (
              <TabsTrigger key={type.key} value={type.key}>{type.label}</TabsTrigger>
            ))}
          </TabsList>

          {listingTypes.map(type => (
            <TabsContent key={type.key} value={type.key} className="space-y-6">
              {/* Budget Settings */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Min Budget (₱)</Label>
                  <Input
                    type="number"
                    value={settings[type.key]?.min_budget || 100}
                    onChange={(e) => updateSetting(type.key, 'min_budget', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Max Budget (₱)</Label>
                  <Input
                    type="number"
                    value={settings[type.key]?.max_budget || 100000}
                    onChange={(e) => updateSetting(type.key, 'max_budget', parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Min Duration (Days)</Label>
                  <Input
                    type="number"
                    value={settings[type.key]?.min_duration_days || 1}
                    onChange={(e) => updateSetting(type.key, 'min_duration_days', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Max Duration (Days)</Label>
                  <Input
                    type="number"
                    value={settings[type.key]?.max_duration_days || 90}
                    onChange={(e) => updateSetting(type.key, 'max_duration_days', parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Impression Settings */}
              <Card className="p-4 bg-muted/50">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Impression Delivery (Facebook-like Algorithm)
                </h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label>Cost per Impression (₱)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={settings[type.key]?.cost_per_impression || 0.10}
                      onChange={(e) => updateSetting(type.key, 'cost_per_impression', parseFloat(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Budget ÷ Cost = Total Impressions
                    </p>
                  </div>
                  <div>
                    <Label>Min Impressions/Day</Label>
                    <Input
                      type="number"
                      value={settings[type.key]?.min_impressions_per_day || 50}
                      onChange={(e) => updateSetting(type.key, 'min_impressions_per_day', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Max Impressions/Day</Label>
                    <Input
                      type="number"
                      value={settings[type.key]?.max_impressions_per_day || 5000}
                      onChange={(e) => updateSetting(type.key, 'max_impressions_per_day', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Boost Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={settings[type.key]?.boost_multiplier || 2.0}
                    onChange={(e) => updateSetting(type.key, 'boost_multiplier', parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sponsored items appear {settings[type.key]?.boost_multiplier || 2}x more often
                  </p>
                </div>
              </Card>

              {/* Commission Settings */}
              <Card className="p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Commission Distribution
                  </h4>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`affiliate-${type.key}`} className="text-sm">
                      Enable Affiliate Commissions
                    </Label>
                    <Switch
                      id={`affiliate-${type.key}`}
                      checked={settings[type.key]?.enable_affiliate_commissions ?? true}
                      onCheckedChange={(checked) => updateSetting(type.key, 'enable_affiliate_commissions', checked)}
                    />
                  </div>
                </div>

                {settings[type.key]?.enable_affiliate_commissions ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                      <div>
                        <Label className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Referrer Commission
                        </Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={settings[type.key]?.referrer_commission_percentage || 10}
                          onChange={(e) => updateSetting(type.key, 'referrer_commission_percentage', parseFloat(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Recurring for affiliates who refer advertisers
                        </p>
                      </div>
                      <div>
                        <Label>Unilevel Pool %</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={settings[type.key]?.unilevel_percentage || 40}
                          onChange={(e) => updateSetting(type.key, 'unilevel_percentage', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Stairstep Pool %</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={settings[type.key]?.stairstep_percentage || 35}
                          onChange={(e) => updateSetting(type.key, 'stairstep_percentage', parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Leadership Pool %</Label>
                        <Input
                          type="number"
                          step="0.5"
                          value={settings[type.key]?.leadership_percentage || 25}
                          onChange={(e) => updateSetting(type.key, 'leadership_percentage', parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="bg-background p-3 rounded-lg">
                      <p className="text-sm font-medium">Commission Breakdown Example (₱1,000 ad spend):</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Referrer:</span>
                          <span className="ml-1 font-medium">₱{((settings[type.key]?.referrer_commission_percentage || 10) * 10).toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unilevel:</span>
                          <span className="ml-1 font-medium">₱{((1000 - (settings[type.key]?.referrer_commission_percentage || 10) * 10) * (settings[type.key]?.unilevel_percentage || 40) / 100).toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Stairstep:</span>
                          <span className="ml-1 font-medium">₱{((1000 - (settings[type.key]?.referrer_commission_percentage || 10) * 10) * (settings[type.key]?.stairstep_percentage || 35) / 100).toFixed(0)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Leadership:</span>
                          <span className="ml-1 font-medium">₱{((1000 - (settings[type.key]?.referrer_commission_percentage || 10) * 10) * (settings[type.key]?.leadership_percentage || 25) / 100).toFixed(0)}</span>
                        </div>
                        <div className="text-primary">
                          <span className="text-muted-foreground">Admin:</span>
                          <span className="ml-1 font-medium">₱{(adminProfit * 10).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-background p-4 rounded-lg text-center">
                    <DollarSign className="h-8 w-8 mx-auto text-primary mb-2" />
                    <p className="font-medium">Admin Only Mode</p>
                    <p className="text-sm text-muted-foreground">100% of ad revenue goes to admin profit</p>
                  </div>
                )}
              </Card>

              {/* Payment Instructions */}
              <div>
                <Label>Payment Instructions</Label>
                <Textarea
                  value={settings[type.key]?.instructions || ""}
                  onChange={(e) => updateSetting(type.key, 'instructions', e.target.value)}
                  placeholder="Instructions shown to users when submitting payment proof..."
                  rows={3}
                />
              </div>

              <Button onClick={() => handleSave(type.key)} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save {type.label} Settings
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}