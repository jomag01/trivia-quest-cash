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
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ProductCategoryManagement = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    display_order: 0,
    is_active: true,
  });
  const [iconType, setIconType] = useState<"emoji" | "image">("emoji");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      toast.error("Failed to load categories");
      return;
    }

    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      const { error } = await supabase
        .from("product_categories")
        .update(formData)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Failed to update category");
        return;
      }

      toast.success("Category updated successfully!");
    } else {
      const { error } = await supabase
        .from("product_categories")
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
    if (!confirm("Are you sure you want to delete this category? Products in this category will be uncategorized.")) return;

    const { error } = await supabase
      .from("product_categories")
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
    const { error } = await supabase
      .from("product_categories")
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
      description: "",
      icon: "",
      display_order: 0,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const openEditDialog = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "",
      display_order: category.display_order,
      is_active: category.is_active,
    });
    // Detect if icon is an image URL or emoji
    if (category.icon && (category.icon.startsWith("http") || category.icon.startsWith("data:"))) {
      setIconType("image");
    } else {
      setIconType("emoji");
    }
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Product Categories</h2>
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
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">
                {editingCategory ? "Edit Category" : "Add Category"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="name" className="text-sm">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="description" className="text-sm">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-sm">Icon Type</Label>
                  <Tabs value={iconType} onValueChange={(v) => setIconType(v as "emoji" | "image")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="emoji" className="text-xs">Emoji</TabsTrigger>
                      <TabsTrigger value="image" className="text-xs">Upload Image</TabsTrigger>
                    </TabsList>
                    <TabsContent value="emoji" className="mt-2">
                      <Input
                        id="icon"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="📱"
                        className="text-lg h-9"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Win: Win + . | Mac: Cmd + Ctrl + Space
                      </p>
                    </TabsContent>
                    <TabsContent value="image" className="mt-2">
                      <ImageUploadCrop
                        onImageUploaded={(url) => setFormData({ ...formData, icon: url })}
                        currentImage={formData.icon && (formData.icon.startsWith("http") || formData.icon.startsWith("data:")) ? formData.icon : undefined}
                        maxSizeKB={200}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
                <div>
                  <Label htmlFor="display_order" className="text-sm">Order</Label>
                  <Input
                    id="display_order"
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-2">
                <Label htmlFor="is_active" className="text-sm">Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 h-9">
                  {editingCategory ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                  className="h-9"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="p-3 md:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <GripVertical className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground flex-shrink-0" />
                {category.icon && (category.icon.startsWith("http") || category.icon.startsWith("data:")) ? (
                  <img src={category.icon} alt={category.name} className="w-8 h-8 md:w-10 md:h-10 rounded object-cover flex-shrink-0" />
                ) : (
                  category.icon && <span className="text-2xl md:text-3xl flex-shrink-0">{category.icon}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm md:text-lg font-semibold truncate">{category.name}</h3>
                    <Badge variant={category.is_active ? "default" : "secondary"} className="text-xs">
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{category.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Order: {category.display_order}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleActive(category.id, category.is_active)}
                  className="h-8 w-8 p-0"
                >
                  {category.is_active ? <EyeOff className="w-3 h-3 md:w-4 md:h-4" /> : <Eye className="w-3 h-3 md:w-4 md:h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(category)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-3 h-3 md:w-4 md:h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(category.id)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
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
