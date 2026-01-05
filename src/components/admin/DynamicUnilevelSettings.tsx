import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Loader2, Info, Plus, Trash2, Edit, ArrowLeft } from "lucide-react";

interface UnilevelLevel {
  id: string;
  level_number: number;
  level_name: string;
  commission_percentage: number;
  is_active: boolean;
}

interface DynamicUnilevelSettingsProps {
  onBack: () => void;
}

export default function DynamicUnilevelSettings({ onBack }: DynamicUnilevelSettingsProps) {
  const [levels, setLevels] = useState<UnilevelLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDialog, setAddDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState<UnilevelLevel | null>(null);
  const [formData, setFormData] = useState({
    level_name: '',
    commission_percentage: ''
  });

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("dynamic_unilevel_levels")
        .select("*")
        .order("level_number", { ascending: true });

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error("Error fetching levels:", error);
      toast.error("Failed to load unilevel levels");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLevel = async () => {
    setSaving(true);
    try {
      const nextLevelNumber = levels.length > 0 
        ? Math.max(...levels.map(l => l.level_number)) + 1 
        : 1;

      const { error } = await supabase
        .from("dynamic_unilevel_levels")
        .insert({
          level_number: nextLevelNumber,
          level_name: formData.level_name || `Level ${nextLevelNumber}`,
          commission_percentage: parseFloat(formData.commission_percentage) || 0,
          is_active: true
        });

      if (error) throw error;

      toast.success("New level added successfully");
      setAddDialog(false);
      setFormData({ level_name: '', commission_percentage: '' });
      fetchLevels();
    } catch (error) {
      console.error("Error adding level:", error);
      toast.error("Failed to add level");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLevel = async () => {
    if (!editingLevel) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("dynamic_unilevel_levels")
        .update({
          level_name: formData.level_name,
          commission_percentage: parseFloat(formData.commission_percentage)
        })
        .eq("id", editingLevel.id);

      if (error) throw error;

      toast.success("Level updated successfully");
      setEditingLevel(null);
      setFormData({ level_name: '', commission_percentage: '' });
      fetchLevels();
    } catch (error) {
      console.error("Error updating level:", error);
      toast.error("Failed to update level");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (level: UnilevelLevel) => {
    try {
      const { error } = await supabase
        .from("dynamic_unilevel_levels")
        .update({ is_active: !level.is_active })
        .eq("id", level.id);

      if (error) throw error;

      toast.success(level.is_active ? "Level deactivated" : "Level activated");
      fetchLevels();
    } catch (error) {
      toast.error("Failed to update level status");
    }
  };

  const handleDeleteLevel = async (id: string) => {
    if (!confirm("Delete this level? This may affect commission calculations.")) return;

    try {
      const { error } = await supabase
        .from("dynamic_unilevel_levels")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Level deleted");
      fetchLevels();
    } catch (error) {
      toast.error("Failed to delete level");
    }
  };

  const openEditDialog = (level: UnilevelLevel) => {
    setEditingLevel(level);
    setFormData({
      level_name: level.level_name,
      commission_percentage: level.commission_percentage.toString()
    });
  };

  const totalPercentage = levels
    .filter(l => l.is_active)
    .reduce((sum, l) => sum + Number(l.commission_percentage), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Admin Menu
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6" />
              <div>
                <CardTitle>Dynamic Unilevel Commission Settings</CardTitle>
                <CardDescription>
                  Configure commission levels dynamically - add or remove levels as needed
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Level
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg mb-6">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-2">How Unilevel Commissions Work:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Level 1:</strong> Your direct referral (person you invited)</li>
                  <li><strong>Higher Levels:</strong> Referrals of your referrals, extending downline</li>
                  <li>Commissions are calculated on <strong>PROFIT ONLY</strong></li>
                  <li>You can add unlimited levels based on your business model</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Levels Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Level</th>
                  <th className="text-left p-3 text-sm font-medium">Name</th>
                  <th className="text-center p-3 text-sm font-medium">Commission %</th>
                  <th className="text-center p-3 text-sm font-medium">Active</th>
                  <th className="text-right p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.id} className={`border-t ${!level.is_active ? 'opacity-50' : ''}`}>
                    <td className="p-3 font-medium">{level.level_number}</td>
                    <td className="p-3">{level.level_name}</td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-primary">{level.commission_percentage}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={level.is_active}
                        onCheckedChange={() => handleToggleActive(level)}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(level)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteLevel(level.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Active Payout: </span>
              <span className={`font-medium ${totalPercentage > 20 ? "text-destructive" : "text-primary"}`}>
                {totalPercentage.toFixed(2)}%
              </span>
              {totalPercentage > 20 && (
                <span className="text-destructive text-xs ml-2">(High payout warning)</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {levels.filter(l => l.is_active).length} active levels
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Commission Example Card */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Calculation Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/30 p-4 rounded-lg space-y-4 text-sm">
            <p className="font-semibold">Scenario: Team member orders ₱100,000 (Profit: ₱40,000)</p>
            <div className="space-y-2">
              {levels.filter(l => l.is_active).map((level) => (
                <div key={level.id} className="flex justify-between">
                  <span>{level.level_name}: {level.commission_percentage}%</span>
                  <strong className="text-green-600">
                    ₱{(40000 * Number(level.commission_percentage) / 100).toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total Commission Payout:</span>
              <span className="text-orange-600">
                ₱{(40000 * totalPercentage / 100).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between font-semibold text-green-600">
              <span>Admin Net Profit:</span>
              <span>₱{(40000 - (40000 * totalPercentage / 100)).toLocaleString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Level Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Unilevel Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Level Name</Label>
              <Input
                value={formData.level_name}
                onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
                placeholder={`Level ${levels.length + 1}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Percentage (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commission_percentage}
                onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                placeholder="0.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddLevel} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Level Dialog */}
      <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Level {editingLevel?.level_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Level Name</Label>
              <Input
                value={formData.level_name}
                onChange={(e) => setFormData({ ...formData, level_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Percentage (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commission_percentage}
                onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateLevel} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}