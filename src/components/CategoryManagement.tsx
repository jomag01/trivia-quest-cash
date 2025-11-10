import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";

interface GameCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string | null;
  color_from: string;
  color_to: string;
  is_active: boolean;
  min_level_required: number;
  created_at: string;
  updated_at: string;
}

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GameCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    icon: "",
    description: "",
    color_from: "from-blue-500",
    color_to: "to-purple-600",
    min_level_required: 1,
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await (supabase as any)
      .from("game_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load categories");
      return;
    }

    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      const { error } = await (supabase as any)
        .from("game_categories")
        .update(formData)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Failed to update category");
        return;
      }

      toast.success("Category updated successfully!");
    } else {
      const { error } = await (supabase as any)
        .from("game_categories")
        .insert([formData]);

      if (error) {
        toast.error("Failed to create category");
        return;
      }

      toast.success("Category created successfully!");
    }

    resetForm();
    fetchCategories();
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const { error } = await (supabase as any)
      .from("game_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete category");
      return;
    }

    toast.success("Category deleted successfully!");
    fetchCategories();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await (supabase as any)
      .from("game_categories")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update category status");
      return;
    }

    toast.success(`Category ${!currentStatus ? 'activated' : 'deactivated'}`);
    fetchCategories();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      icon: "",
      description: "",
      color_from: "from-blue-500",
      color_to: "to-purple-600",
      min_level_required: 1,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const openEditDialog = (category: GameCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      description: category.description || "",
      color_from: category.color_from,
      color_to: category.color_to,
      min_level_required: category.min_level_required,
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Game Categories</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="🌍"
                    required
                    className="text-xl"
                  />
                </div>

                <div>
                  <Label htmlFor="min_level">Min Level</Label>
                  <Input
                    id="min_level"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.min_level_required}
                    onChange={(e) => setFormData({ ...formData, min_level_required: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="color_from">From</Label>
                  <Input
                    id="color_from"
                    value={formData.color_from}
                    onChange={(e) => setFormData({ ...formData, color_from: e.target.value })}
                    placeholder="from-blue-500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="color_to">To</Label>
                  <Input
                    id="color_to"
                    value={formData.color_to}
                    onChange={(e) => setFormData({ ...formData, color_to: e.target.value })}
                    placeholder="to-purple-600"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <Label htmlFor="is_active">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">
                  {editingCategory ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{category.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Slug: {category.slug} • Min Level: {category.min_level_required}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(category.id, category.is_active)}
                >
                  {category.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(category)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No categories yet. Add your first category!</p>
        </Card>
      )}
    </div>
  );
};
