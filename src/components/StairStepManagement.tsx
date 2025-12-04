import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, Save, X, Plus } from "lucide-react";

interface StairStepConfig {
  id: string;
  step_number: number;
  step_name: string;
  commission_percentage: number;
  sales_quota: number;
  months_to_qualify: number;
  breakaway_percentage: number;
  qualification_type: 'personal' | 'group' | 'combined';
  active: boolean;
}

interface FormData {
  step_number: string;
  step_name: string;
  commission_percentage: string;
  sales_quota: string;
  months_to_qualify: string;
  breakaway_percentage: string;
  qualification_type: 'personal' | 'group' | 'combined';
}

export default function StairStepManagement() {
  const [configs, setConfigs] = useState<StairStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    step_number: "",
    step_name: "",
    commission_percentage: "",
    sales_quota: "",
    months_to_qualify: "3",
    breakaway_percentage: "0",
    qualification_type: "combined",
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("stair_step_config")
        .select("*")
        .order("step_number");

      if (error) throw error;
      setConfigs((data || []).map(d => ({
        ...d,
        qualification_type: d.qualification_type as 'personal' | 'group' | 'combined'
      })));
    } catch (error: any) {
      toast.error("Failed to load stair step configuration");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: StairStepConfig) => {
    setEditingId(config.id);
    setFormData({
      step_number: config.step_number.toString(),
      step_name: config.step_name,
      commission_percentage: config.commission_percentage.toString(),
      sales_quota: config.sales_quota.toString(),
      months_to_qualify: config.months_to_qualify.toString(),
      breakaway_percentage: config.breakaway_percentage.toString(),
      qualification_type: config.qualification_type,
    });
  };

  const handleSave = async () => {
    try {
      if (isAdding) {
        const { error } = await supabase.from("stair_step_config").insert({
          step_number: parseInt(formData.step_number),
          step_name: formData.step_name,
          commission_percentage: parseFloat(formData.commission_percentage),
          sales_quota: parseFloat(formData.sales_quota),
          months_to_qualify: parseInt(formData.months_to_qualify),
          breakaway_percentage: parseFloat(formData.breakaway_percentage),
          qualification_type: formData.qualification_type,
        });

        if (error) throw error;
        toast.success("Stair step added successfully");
        setIsAdding(false);
      } else if (editingId) {
        const { error } = await supabase
          .from("stair_step_config")
          .update({
            step_name: formData.step_name,
            commission_percentage: parseFloat(formData.commission_percentage),
            sales_quota: parseFloat(formData.sales_quota),
            months_to_qualify: parseInt(formData.months_to_qualify),
            breakaway_percentage: parseFloat(formData.breakaway_percentage),
            qualification_type: formData.qualification_type,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Stair step updated successfully");
        setEditingId(null);
      }

      setFormData({
        step_number: "",
        step_name: "",
        commission_percentage: "",
        sales_quota: "",
        months_to_qualify: "3",
        breakaway_percentage: "0",
        qualification_type: "combined",
      });
      fetchConfigs();
    } catch (error: any) {
      toast.error(error.message || "Failed to save stair step configuration");
      console.error(error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({
      step_number: "",
      step_name: "",
      commission_percentage: "",
      sales_quota: "",
      months_to_qualify: "3",
      breakaway_percentage: "0",
      qualification_type: "combined",
    });
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("stair_step_config")
        .update({ active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Step ${currentActive ? "deactivated" : "activated"} successfully`);
      fetchConfigs();
    } catch (error: any) {
      toast.error("Failed to update step status");
      console.error(error);
    }
  };

  const handleAddNew = () => {
    setIsAdding(true);
    const nextStep = configs.length > 0 ? Math.max(...configs.map(c => c.step_number)) + 1 : 1;
    setFormData({
      step_number: nextStep.toString(),
      step_name: `Step ${nextStep}`,
      commission_percentage: "",
      sales_quota: "",
      months_to_qualify: "3",
      breakaway_percentage: "0",
      qualification_type: "combined",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stair Step MLM Commission Plan</CardTitle>
        <CardDescription>
          Configure the stair step plan with leadership overrides and breakaway rules.
          Affiliates must qualify for 3 consecutive months to fix their position.
          Unqualified ranks revert to 0% at month end.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="font-semibold">Commission Structure</h3>
            <p className="text-sm text-muted-foreground">
              Uplines earn the differential between their rate and downline's rate.
              Step 3 (8%) earns 2% breakaway override from Step 3 organizations.
            </p>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          )}
        </div>

        {(isAdding || editingId) && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="step_number">Step Number</Label>
                  <Input
                    id="step_number"
                    type="number"
                    value={formData.step_number}
                    onChange={(e) => setFormData({ ...formData, step_number: e.target.value })}
                    disabled={!isAdding}
                  />
                </div>
                <div>
                  <Label htmlFor="step_name">Step Name</Label>
                  <Input
                    id="step_name"
                    value={formData.step_name}
                    onChange={(e) => setFormData({ ...formData, step_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="commission_percentage">Commission %</Label>
                  <Input
                    id="commission_percentage"
                    type="number"
                    step="0.01"
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="sales_quota">Sales Quota (₱)</Label>
                  <Input
                    id="sales_quota"
                    type="number"
                    step="0.01"
                    value={formData.sales_quota}
                    onChange={(e) => setFormData({ ...formData, sales_quota: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="months_to_qualify">Months to Qualify</Label>
                  <Input
                    id="months_to_qualify"
                    type="number"
                    value={formData.months_to_qualify}
                    onChange={(e) => setFormData({ ...formData, months_to_qualify: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="breakaway_percentage">Breakaway Override %</Label>
                  <Input
                    id="breakaway_percentage"
                    type="number"
                    step="0.01"
                    value={formData.breakaway_percentage}
                    onChange={(e) => setFormData({ ...formData, breakaway_percentage: e.target.value })}
                  />
                   <p className="text-xs text-muted-foreground mt-1">
                    Override earned from same-level downlines (typically Step 3 only)
                  </p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="qualification_type">Sales Qualification Type</Label>
                  <Select 
                    value={formData.qualification_type} 
                    onValueChange={(value: 'personal' | 'group' | 'combined') => 
                      setFormData({ ...formData, qualification_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="combined">Combined (Personal + Group Sales)</SelectItem>
                      <SelectItem value="personal">Personal Sales Only</SelectItem>
                      <SelectItem value="group">Group Sales Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Determines which sales count toward qualification quota
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Commission %</TableHead>
              <TableHead>Sales Quota</TableHead>
              <TableHead>Qualification</TableHead>
              <TableHead>Qualify Months</TableHead>
              <TableHead>Breakaway %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell className="font-medium">{config.step_number}</TableCell>
                <TableCell>{config.step_name}</TableCell>
                <TableCell>{config.commission_percentage}%</TableCell>
                <TableCell>₱{config.sales_quota.toLocaleString()}</TableCell>
                <TableCell className="capitalize">{config.qualification_type}</TableCell>
                <TableCell>{config.months_to_qualify}</TableCell>
                <TableCell>{config.breakaway_percentage}%</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.active}
                      onCheckedChange={() => handleToggleActive(config.id, config.active)}
                    />
                    <span className="text-sm">{config.active ? "Active" : "Inactive"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {editingId !== config.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(config)}
                      disabled={editingId !== null || isAdding}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold">Commission Rules:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Uplines earn the <strong>differential</strong> between their commission % and their downline's %</li>
            <li>No commission earned from affiliates at the <strong>same level</strong></li>
            <li>Must qualify for <strong>3 consecutive months</strong> to fix position at any level</li>
            <li>Non-fixed ranks <strong>revert to 0%</strong> at the end of each month</li>
            <li>Step 3 affiliates earn <strong>2% breakaway override</strong> from their Step 3 downline organizations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
