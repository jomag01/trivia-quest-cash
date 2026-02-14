import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";

export default function TransferFeeSettings() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["transfer-fee-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .in("key", ["transfer_fee_enabled", "transfer_fee_type", "transfer_fee_value", "transfer_min_amount"]);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s) => (map[s.key] = s.value || ""));
      return map;
    },
  });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [feeType, setFeeType] = useState<string | null>(null);
  const [feeValue, setFeeValue] = useState<string | null>(null);
  const [minAmount, setMinAmount] = useState<string | null>(null);

  const currentEnabled = enabled ?? settings?.transfer_fee_enabled === "true";
  const currentFeeType = feeType ?? settings?.transfer_fee_type ?? "percentage";
  const currentFeeValue = feeValue ?? settings?.transfer_fee_value ?? "2";
  const currentMinAmount = minAmount ?? settings?.transfer_min_amount ?? "10";

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "transfer_fee_enabled", value: currentEnabled ? "true" : "false" },
        { key: "transfer_fee_type", value: currentFeeType },
        { key: "transfer_fee_value", value: currentFeeValue },
        { key: "transfer_min_amount", value: currentMinAmount },
      ];

      for (const u of updates) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: u.value, updated_at: new Date().toISOString() })
          .eq("key", u.key);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["transfer-fee-settings"] });
      toast.success("Transfer fee settings saved");
      setEnabled(null);
      setFeeType(null);
      setFeeValue(null);
      setMinAmount(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-primary" />
          Transfer Fee Settings
        </h2>
        <p className="text-muted-foreground">Configure fees charged on wallet-to-wallet transfers</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fee Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Transfer Fee</Label>
              <p className="text-sm text-muted-foreground">
                When enabled, a fee is deducted from the sender on every transfer
              </p>
            </div>
            <Switch checked={currentEnabled} onCheckedChange={setEnabled} />
          </div>

          {currentEnabled && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fee Type</Label>
                  <Select value={currentFeeType} onValueChange={setFeeType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    Fee Value {currentFeeType === "percentage" ? "(%)" : "(₱)"}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step={currentFeeType === "percentage" ? "0.1" : "1"}
                    value={currentFeeValue}
                    onChange={(e) => setFeeValue(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Minimum Transfer Amount (₱)</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={currentMinAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Users cannot transfer less than this amount
                </p>
              </div>

              <Card className="bg-muted/50 border-dashed">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-1">Preview</p>
                  <p className="text-sm text-muted-foreground">
                    For a ₱1,000 transfer, the fee would be{" "}
                    <span className="font-semibold text-foreground">
                      ₱
                      {currentFeeType === "percentage"
                        ? (1000 * Number(currentFeeValue) / 100).toFixed(2)
                        : Number(currentFeeValue).toFixed(2)}
                    </span>
                    , total deducted from sender:{" "}
                    <span className="font-semibold text-foreground">
                      ₱
                      {currentFeeType === "percentage"
                        ? (1000 + 1000 * Number(currentFeeValue) / 100).toFixed(2)
                        : (1000 + Number(currentFeeValue)).toFixed(2)}
                    </span>
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
