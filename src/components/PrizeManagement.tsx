import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Edit, Save, X } from "lucide-react";

interface Prize {
  id: string;
  level: number;
  credits: number;
  description: string | null;
  is_active: boolean;
}

export const PrizeManagement = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Prize>>({});

  useEffect(() => {
    fetchPrizes();
  }, []);

  const fetchPrizes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('prize_config')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      setPrizes(data || []);
    } catch (error) {
      console.error('Error fetching prizes:', error);
      toast.error('Failed to load prizes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (prize: Prize) => {
    setEditingId(prize.id);
    setEditForm(prize);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const { error } = await (supabase as any)
        .from('prize_config')
        .update({
          credits: editForm.credits,
          description: editForm.description,
          is_active: editForm.is_active
        })
        .eq('id', editingId);

      if (error) throw error;

      toast.success('Prize updated successfully');
      setEditingId(null);
      setEditForm({});
      fetchPrizes();
    } catch (error) {
      console.error('Error updating prize:', error);
      toast.error('Failed to update prize');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading prizes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Prize Configuration</h2>
      </div>

      <div className="grid gap-4">
        {prizes.map((prize) => (
          <Card key={prize.id} className="p-6">
            {editingId === prize.id ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Level {prize.level} Prize</h3>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="credits">Credits Amount</Label>
                    <Input
                      id="credits"
                      type="number"
                      value={editForm.credits || 0}
                      onChange={(e) => setEditForm({ ...editForm, credits: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold">Level {prize.level}</h3>
                    {!prize.is_active && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-primary mb-2">
                    {prize.credits.toFixed(2)} Credits
                  </p>
                  {prize.description && (
                    <p className="text-sm text-muted-foreground">{prize.description}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => handleEdit(prize)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-bold mb-2">💡 Prize System Info</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Players receive credits automatically when they complete milestone levels</li>
          <li>• Each prize can only be claimed once per user</li>
          <li>• You can adjust credit amounts and descriptions at any time</li>
          <li>• Disable prizes by toggling the "Active" switch</li>
        </ul>
      </Card>
    </div>
  );
};