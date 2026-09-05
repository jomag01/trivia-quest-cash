import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Setting {
  id: string;
  resource_type: string;
  resource_label: string;
  service_price: number;
  commission_type: string;
  commission_value: number;
  is_active: boolean;
}

export default function TeachersResourceCommissionSettings() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teachers_resource_commission_settings")
      .select("*")
      .order("resource_label");
    if (error) toast.error("Could not load settings");
    setRows((data as Setting[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (id: string, patch: Partial<Setting>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async (row: Setting) => {
    setSavingId(row.id);
    const { error } = await supabase
      .from("teachers_resource_commission_settings")
      .update({
        service_price: Number(row.service_price) || 0,
        commission_type: row.commission_type,
        commission_value: Number(row.commission_value) || 0,
        is_active: row.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast.error("Could not save changes");
      return;
    }
    toast.success(`${row.resource_label} settings saved`);
  };

  const preview = (row: Setting) =>
    row.commission_type === "fixed"
      ? Number(row.commission_value) || 0
      : ((Number(row.service_price) || 0) * (Number(row.commission_value) || 0)) / 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-emerald-500" />
          Teachers' Resources Referral Commission
        </CardTitle>
        <CardDescription>
          Set the service price and the direct referral reward paid to the affiliate who referred the teacher.
          Choose a percentage of the service price or a fixed peso amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{row.resource_label}</h4>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${row.id}`} className="text-xs text-muted-foreground">
                    Active
                  </Label>
                  <Switch
                    id={`active-${row.id}`}
                    checked={row.is_active}
                    onCheckedChange={(v) => update(row.id, { is_active: v })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Service price (₱)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.service_price}
                    onChange={(e) => update(row.id, { service_price: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Reward type</Label>
                  <Select
                    value={row.commission_type}
                    onValueChange={(v) => update(row.id, { commission_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage of price</SelectItem>
                      <SelectItem value="fixed">Fixed amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{row.commission_type === "fixed" ? "Amount (₱)" : "Percentage (%)"}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.commission_value}
                    onChange={(e) => update(row.id, { commission_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Referrer earns <span className="font-semibold text-foreground">₱{preview(row).toFixed(2)}</span> each time
                </p>
                <Button onClick={() => save(row)} disabled={savingId === row.id}>
                  {savingId === row.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
