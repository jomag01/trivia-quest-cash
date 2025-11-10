import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Trophy, MapPin } from "lucide-react";

interface TreasureLevel {
  id: string;
  level_number: number;
  name: string;
  description: string | null;
  required_symbols: number;
  credit_reward: number;
  map_image_url: string | null;
  difficulty_multiplier: number;
  time_limit_seconds: number | null;
  is_active: boolean;
}

export const TreasureHuntManagement = () => {
  const [levels, setLevels] = useState<TreasureLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<TreasureLevel | null>(null);
  const [formData, setFormData] = useState({
    level_number: 1,
    name: "",
    description: "",
    required_symbols: 3,
    credit_reward: 10,
    map_image_url: "",
    difficulty_multiplier: 1.0,
    time_limit_seconds: null as number | null,
    is_active: true,
  });

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("treasure_hunt_levels")
        .select("*")
        .order("level_number");

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error("Error fetching levels:", error);
      toast.error("Failed to fetch treasure hunt levels");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingLevel) {
        const { error } = await supabase
          .from("treasure_hunt_levels")
          .update(formData)
          .eq("id", editingLevel.id);

        if (error) throw error;
        toast.success("Level updated successfully!");
      } else {
        const { error } = await supabase
          .from("treasure_hunt_levels")
          .insert([formData]);

        if (error) throw error;
        toast.success("Level created successfully!");
      }

      setDialogOpen(false);
      resetForm();
      fetchLevels();
    } catch (error) {
      console.error("Error saving level:", error);
      toast.error("Failed to save level");
    }
  };

  const handleDelete = async (id: string, levelNumber: number) => {
    if (!confirm(`Are you sure you want to delete Level ${levelNumber}?`)) return;

    try {
      const { error } = await supabase
        .from("treasure_hunt_levels")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Level deleted successfully!");
      fetchLevels();
    } catch (error) {
      console.error("Error deleting level:", error);
      toast.error("Failed to delete level");
    }
  };

  const handleToggleActive = async (level: TreasureLevel) => {
    try {
      const { error } = await supabase
        .from("treasure_hunt_levels")
        .update({ is_active: !level.is_active })
        .eq("id", level.id);

      if (error) throw error;
      toast.success(`Level ${level.is_active ? "deactivated" : "activated"}!`);
      fetchLevels();
    } catch (error) {
      console.error("Error toggling level:", error);
      toast.error("Failed to update level status");
    }
  };

  const resetForm = () => {
    setFormData({
      level_number: levels.length + 1,
      name: "",
      description: "",
      required_symbols: 3,
      credit_reward: 10,
      map_image_url: "",
      difficulty_multiplier: 1.0,
      time_limit_seconds: null,
      is_active: true,
    });
    setEditingLevel(null);
  };

  const openEditDialog = (level: TreasureLevel) => {
    setEditingLevel(level);
    setFormData({
      level_number: level.level_number,
      name: level.name,
      description: level.description || "",
      required_symbols: level.required_symbols,
      credit_reward: level.credit_reward,
      map_image_url: level.map_image_url || "",
      difficulty_multiplier: level.difficulty_multiplier,
      time_limit_seconds: level.time_limit_seconds,
      is_active: level.is_active,
    });
    setDialogOpen(true);
  };

  if (loading) return <div className="p-4">Loading treasure hunt levels...</div>;

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Treasure Hunt Levels
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Level
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLevel ? "Edit Level" : "Create New Level"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="level_number">Level Number</Label>
                  <Input
                    id="level_number"
                    type="number"
                    min="1"
                    max="15"
                    value={formData.level_number}
                    onChange={(e) =>
                      setFormData({ ...formData, level_number: parseInt(e.target.value) })
                    }
                    required
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="required_symbols">Symbols Required</Label>
                  <Input
                    id="required_symbols"
                    type="number"
                    min="1"
                    value={formData.required_symbols}
                    onChange={(e) =>
                      setFormData({ ...formData, required_symbols: parseInt(e.target.value) })
                    }
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Level Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="credit_reward">Credit Reward</Label>
                  <Input
                    id="credit_reward"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit_reward}
                    onChange={(e) =>
                      setFormData({ ...formData, credit_reward: parseFloat(e.target.value) })
                    }
                    required
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty_multiplier">Difficulty</Label>
                  <Input
                    id="difficulty_multiplier"
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.difficulty_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, difficulty_multiplier: parseFloat(e.target.value) })
                    }
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="time_limit_seconds">Time Limit (seconds, optional)</Label>
                <Input
                  id="time_limit_seconds"
                  type="number"
                  min="0"
                  value={formData.time_limit_seconds || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      time_limit_seconds: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  className="h-9"
                />
              </div>

              <div>
                <Label htmlFor="map_image_url">Map Image URL (optional)</Label>
                <Input
                  id="map_image_url"
                  value={formData.map_image_url}
                  onChange={(e) => setFormData({ ...formData, map_image_url: e.target.value })}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingLevel ? "Update Level" : "Create Level"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((level) => (
          <Card key={level.id} className={!level.is_active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Level {level.level_number}: {level.name}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleActive(level)}
                    className="h-7 w-7 p-0"
                  >
                    {level.is_active ? "🟢" : "🔴"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(level)}
                    className="h-7 w-7 p-0"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(level.id, level.level_number)}
                    className="h-7 w-7 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{level.description}</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="font-semibold">Symbols:</span> {level.required_symbols}
                </div>
                <div>
                  <span className="font-semibold">Reward:</span> {level.credit_reward} credits
                </div>
                <div>
                  <span className="font-semibold">Difficulty:</span> {level.difficulty_multiplier}x
                </div>
                {level.time_limit_seconds && (
                  <div>
                    <span className="font-semibold">Time:</span> {level.time_limit_seconds}s
                  </div>
                )}
              </div>
              {level.level_number === 5 && (
                <div className="bg-accent/20 p-2 rounded text-xs mt-2">
                  🔒 Requires 2 referrals to unlock
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {levels.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No treasure hunt levels found. Create your first level!
        </div>
      )}
    </div>
  );
};