import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Loader2, Info } from "lucide-react";

const LEVEL_KEYS = [
  "unilevel_level_1_percent",
  "unilevel_level_2_percent",
  "unilevel_level_3_percent",
  "unilevel_level_4_percent",
  "unilevel_level_5_percent",
  "unilevel_level_6_percent",
  "unilevel_level_7_percent",
];

const LEVEL_LABELS = [
  "Level 1 (Direct Referral)",
  "Level 2",
  "Level 3",
  "Level 4",
  "Level 5",
  "Level 6",
  "Level 7",
];

export default function UnilevelCommissionSettings() {
  const [percentages, setPercentages] = useState<string[]>(["4", "3", "2", "1.5", "1", "0.75", "0.5"]);
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
        .in("setting_key", LEVEL_KEYS);

      if (error) throw error;

      const newPercentages = [...percentages];
      LEVEL_KEYS.forEach((key, index) => {
        const setting = data?.find((s) => s.setting_key === key);
        if (setting) {
          newPercentages[index] = setting.setting_value;
        }
      });
      setPercentages(newPercentages);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load unilevel settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAll = async () => {
    setSaving(true);
    try {
      const updates = LEVEL_KEYS.map((key, index) => ({
        setting_key: key,
        setting_value: percentages[index],
        description: `Unilevel commission percentage for ${LEVEL_LABELS[index]}`,
      }));

      const { error } = await supabase
        .from("treasure_admin_settings")
        .upsert(updates, { onConflict: "setting_key" });

      if (error) throw error;

      toast.success("Unilevel percentages updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const totalPercentage = percentages.reduce((sum, p) => sum + parseFloat(p || "0"), 0);

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
            <Users className="w-6 h-6" />
            Unilevel 7-Level Network Commissions
          </CardTitle>
          <CardDescription>
            Configure the commission percentage each level earns when their downline makes a purchase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-2">How Unilevel Commissions Work:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Level 1:</strong> Your direct referral (the person you personally invited)</li>
                  <li><strong>Level 2-7:</strong> Referrals of your referrals, up to 7 levels deep</li>
                  <li>When anyone in your 7-level network makes a purchase, you earn the percentage for their level</li>
                  <li>Example: If Level 1 = 4% and someone you invited buys ₱10,000, you earn ₱400</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {LEVEL_KEYS.map((key, index) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{LEVEL_LABELS[index]}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={key}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={percentages[index]}
                    onChange={(e) => {
                      const newPercentages = [...percentages];
                      newPercentages[index] = e.target.value;
                      setPercentages(newPercentages);
                    }}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Payout: </span>
              <span className={`font-medium ${totalPercentage > 15 ? "text-destructive" : "text-primary"}`}>
                {totalPercentage.toFixed(2)}%
              </span>
              {totalPercentage > 15 && (
                <span className="text-destructive text-xs ml-2">(High payout warning)</span>
              )}
            </div>
            <Button onClick={handleUpdateAll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save All Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Calculation Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg space-y-3 text-sm">
            <p><strong>Scenario:</strong> Josh orders products worth ₱250,000</p>
            <p><strong>Josh's Upline (Level 1 - Joseph):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Joseph is Josh's direct referrer (Level 1)</li>
              <li>Level 1 percentage: {percentages[0]}%</li>
              <li>Commission: ₱250,000 × {percentages[0]}% = <strong>₱{(250000 * parseFloat(percentages[0]) / 100).toLocaleString()}</strong></li>
            </ul>
            <p className="pt-2"><strong>If Joseph has an upline (Level 2 to Josh):</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Level 2 percentage: {percentages[1]}%</li>
              <li>Commission: ₱250,000 × {percentages[1]}% = <strong>₱{(250000 * parseFloat(percentages[1]) / 100).toLocaleString()}</strong></li>
            </ul>
            <p className="text-muted-foreground pt-2 italic">
              This continues up to 7 levels, with each upline earning their level's percentage.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
