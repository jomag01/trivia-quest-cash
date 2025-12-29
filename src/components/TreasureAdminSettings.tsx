import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Gem, TrendingUp, Diamond, Loader2, ArrowLeftRight, Sparkles, Wallet, Coins } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Setting {
  setting_key: string;
  setting_value: string;
  description: string;
}

export default function TreasureAdminSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Existing settings
  const [diamondPrice, setDiamondPrice] = useState("");
  const [gemRatio, setGemRatio] = useState("");
  const [minPurchaseDiamonds, setMinPurchaseDiamonds] = useState("");
  const [minReferrals, setMinReferrals] = useState("");
  const [userProductDiamondPercent, setUserProductDiamondPercent] = useState("");
  
  // New conversion settings
  const [creditToDiamondRate, setCreditToDiamondRate] = useState("10");
  const [diamondToCreditRate, setDiamondToCreditRate] = useState("10");
  const [aiCreditToCashRate, setAiCreditToCashRate] = useState("0.10");
  const [aiCreditToDiamondRate, setAiCreditToDiamondRate] = useState("5");
  const [aiCreditToGameCreditRate, setAiCreditToGameCreditRate] = useState("1");
  const [conversionFeePercent, setConversionFeePercent] = useState("5");
  
  // Enable/disable toggles
  const [enableCreditToDiamond, setEnableCreditToDiamond] = useState(true);
  const [enableDiamondToCredit, setEnableDiamondToCredit] = useState(true);
  const [enableAiCreditToCash, setEnableAiCreditToCash] = useState(true);
  const [enableAiCreditToDiamond, setEnableAiCreditToDiamond] = useState(true);
  const [enableAiCreditToGameCredit, setEnableAiCreditToGameCredit] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_admin_settings")
        .select("*");

      if (error) throw error;

      setSettings(data || []);
      
      // Parse all settings
      data?.forEach((s) => {
        switch (s.setting_key) {
          case "diamond_base_price":
            setDiamondPrice(s.setting_value);
            break;
          case "gem_to_diamond_ratio":
            setGemRatio(s.setting_value);
            break;
          case "min_purchase_diamonds_for_earnings":
            setMinPurchaseDiamonds(s.setting_value);
            break;
          case "min_referrals_for_earnings":
            setMinReferrals(s.setting_value);
            break;
          case "user_product_diamond_percent":
            setUserProductDiamondPercent(s.setting_value);
            break;
          case "credit_to_diamond_rate":
            setCreditToDiamondRate(s.setting_value);
            break;
          case "diamond_to_credit_rate":
            setDiamondToCreditRate(s.setting_value);
            break;
          case "ai_credit_to_cash_rate":
            setAiCreditToCashRate(s.setting_value);
            break;
          case "ai_credit_to_diamond_conversion_rate":
            setAiCreditToDiamondRate(s.setting_value);
            break;
          case "ai_credit_to_game_credit_rate":
            setAiCreditToGameCreditRate(s.setting_value);
            break;
          case "conversion_fee_percent":
            setConversionFeePercent(s.setting_value);
            break;
          case "enable_credit_to_diamond":
            setEnableCreditToDiamond(s.setting_value === "true");
            break;
          case "enable_diamond_to_credit":
            setEnableDiamondToCredit(s.setting_value === "true");
            break;
          case "enable_ai_credit_to_cash":
            setEnableAiCreditToCash(s.setting_value === "true");
            break;
          case "enable_ai_credit_to_diamond":
            setEnableAiCreditToDiamond(s.setting_value === "true");
            break;
          case "enable_ai_credit_to_game_credit":
            setEnableAiCreditToGameCredit(s.setting_value === "true");
            break;
        }
      });
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

  const handleToggleSetting = async (key: string, value: boolean) => {
    await handleUpdateSetting(key, value.toString());
    
    // Update local state immediately
    switch (key) {
      case "enable_credit_to_diamond":
        setEnableCreditToDiamond(value);
        break;
      case "enable_diamond_to_credit":
        setEnableDiamondToCredit(value);
        break;
      case "enable_ai_credit_to_cash":
        setEnableAiCreditToCash(value);
        break;
      case "enable_ai_credit_to_diamond":
        setEnableAiCreditToDiamond(value);
        break;
      case "enable_ai_credit_to_game_credit":
        setEnableAiCreditToGameCredit(value);
        break;
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
      {/* Diamond Pricing */}
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

      {/* Gem Conversion Settings */}
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

      {/* Credit ↔ Diamond Conversion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6" />
            Credit ↔ Diamond Conversion
          </CardTitle>
          <CardDescription>
            Configure bidirectional conversion between credits and diamonds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credit to Diamond */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Credit → Diamond</Label>
                <p className="text-xs text-muted-foreground">Allow users to convert credits to diamonds</p>
              </div>
              <Switch
                checked={enableCreditToDiamond}
                onCheckedChange={(v) => handleToggleSetting("enable_credit_to_diamond", v)}
              />
            </div>
            {enableCreditToDiamond && (
              <div>
                <Label htmlFor="creditToDiamond">Credits per Diamond</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="creditToDiamond"
                    type="number"
                    min="1"
                    value={creditToDiamondRate}
                    onChange={(e) => setCreditToDiamondRate(e.target.value)}
                    placeholder="10"
                  />
                  <Button onClick={() => handleUpdateSetting("credit_to_diamond_rate", creditToDiamondRate)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {creditToDiamondRate} credits = 1 💎
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Diamond to Credit */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Diamond → Credit</Label>
                <p className="text-xs text-muted-foreground">Allow users to convert diamonds to credits</p>
              </div>
              <Switch
                checked={enableDiamondToCredit}
                onCheckedChange={(v) => handleToggleSetting("enable_diamond_to_credit", v)}
              />
            </div>
            {enableDiamondToCredit && (
              <div>
                <Label htmlFor="diamondToCredit">Credits per Diamond</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="diamondToCredit"
                    type="number"
                    min="1"
                    value={diamondToCreditRate}
                    onChange={(e) => setDiamondToCreditRate(e.target.value)}
                    placeholder="10"
                  />
                  <Button onClick={() => handleUpdateSetting("diamond_to_credit_rate", diamondToCreditRate)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  1 💎 = {diamondToCreditRate} credits
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Credit Conversion Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6" />
            AI Credit Conversion Settings
          </CardTitle>
          <CardDescription>
            Configure how AI credits can be converted to cash, diamonds, or game credits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* AI Credit to Cash */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium flex items-center gap-2">
                  <Wallet className="w-4 h-4" /> AI Credit → Cash
                </Label>
                <p className="text-xs text-muted-foreground">Allow users to convert AI credits to withdrawable cash</p>
              </div>
              <Switch
                checked={enableAiCreditToCash}
                onCheckedChange={(v) => handleToggleSetting("enable_ai_credit_to_cash", v)}
              />
            </div>
            {enableAiCreditToCash && (
              <div>
                <Label htmlFor="aiCreditToCash">Cash Value per AI Credit (₱)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="aiCreditToCash"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={aiCreditToCashRate}
                    onChange={(e) => setAiCreditToCashRate(e.target.value)}
                    placeholder="0.10"
                  />
                  <Button onClick={() => handleUpdateSetting("ai_credit_to_cash_rate", aiCreditToCashRate)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  1 AI credit = ₱{aiCreditToCashRate} (100 AI credits = ₱{(parseFloat(aiCreditToCashRate || "0") * 100).toFixed(2)})
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* AI Credit to Diamond */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium flex items-center gap-2">
                  <Diamond className="w-4 h-4" /> AI Credit → Diamond
                </Label>
                <p className="text-xs text-muted-foreground">Allow users to convert AI credits to diamonds</p>
              </div>
              <Switch
                checked={enableAiCreditToDiamond}
                onCheckedChange={(v) => handleToggleSetting("enable_ai_credit_to_diamond", v)}
              />
            </div>
            {enableAiCreditToDiamond && (
              <div>
                <Label htmlFor="aiCreditToDiamond">AI Credits per Diamond</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="aiCreditToDiamond"
                    type="number"
                    min="1"
                    value={aiCreditToDiamondRate}
                    onChange={(e) => setAiCreditToDiamondRate(e.target.value)}
                    placeholder="5"
                  />
                  <Button onClick={() => handleUpdateSetting("ai_credit_to_diamond_conversion_rate", aiCreditToDiamondRate)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {aiCreditToDiamondRate} AI credits = 1 💎
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* AI Credit to Game Credit */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium flex items-center gap-2">
                  <Coins className="w-4 h-4" /> AI Credit → Game Credit
                </Label>
                <p className="text-xs text-muted-foreground">Allow users to convert AI credits to game credits</p>
              </div>
              <Switch
                checked={enableAiCreditToGameCredit}
                onCheckedChange={(v) => handleToggleSetting("enable_ai_credit_to_game_credit", v)}
              />
            </div>
            {enableAiCreditToGameCredit && (
              <div>
                <Label htmlFor="aiCreditToGameCredit">Game Credits per AI Credit</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="aiCreditToGameCredit"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={aiCreditToGameCreditRate}
                    onChange={(e) => setAiCreditToGameCreditRate(e.target.value)}
                    placeholder="1"
                  />
                  <Button onClick={() => handleUpdateSetting("ai_credit_to_game_credit_rate", aiCreditToGameCreditRate)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  1 AI credit = {aiCreditToGameCreditRate} game credits
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Fee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Conversion Fee
          </CardTitle>
          <CardDescription>
            Set the percentage fee charged on all conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="conversionFee">Conversion Fee (%)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="conversionFee"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={conversionFeePercent}
                onChange={(e) => setConversionFeePercent(e.target.value)}
                placeholder="5"
              />
              <Button onClick={() => handleUpdateSetting("conversion_fee_percent", conversionFeePercent)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              A {conversionFeePercent}% fee will be deducted from all conversions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* User Product Diamond Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-6 h-6" />
            User Product Diamond Settings
          </CardTitle>
          <CardDescription>
            Configure default diamond rewards for user-uploaded products
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userProductDiamondPercent">
              Default Diamond Reward Percentage (0-100%)
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="userProductDiamondPercent"
                type="number"
                min="0"
                max="100"
                value={userProductDiamondPercent}
                onChange={(e) => setUserProductDiamondPercent(e.target.value)}
                placeholder="10"
              />
              <Button onClick={() => handleUpdateSetting("user_product_diamond_percent", userProductDiamondPercent)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Percentage of wholesale price that converts to diamonds (e.g., 10% of ₱100 = 1 diamond at ₱10/diamond)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Earning & Withdrawal Requirements */}
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
