import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ServiceCategoryFieldsDialog from "@/components/booking/ServiceCategoryFieldsDialog";

interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  display_order: number | null;
  is_active: boolean | null;
  category_type: string | null;
}

const CATEGORY_TYPES = [
  { value: 'standard', label: 'Standard Service', description: 'Basic services like repairs, cleaning, etc.' },
  { value: 'travel', label: 'Travel & Tours', description: 'Travel packages with destinations, activities, accommodations' },
  { value: 'beauty', label: 'Beauty & Wellness', description: 'Spa, salon, massage services' },
  { value: 'education', label: 'Education & Training', description: 'Tutoring, courses, workshops' },
  { value: 'events', label: 'Events & Entertainment', description: 'Event planning, photography, music' },
  { value: 'professional', label: 'Professional Services', description: 'Legal, accounting, consulting' },
];

const ServiceCategoryManagement = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "🔧",
    is_active: true,
    category_type: "standard"
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Failed to load categories");
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    if (editingCategory) {
      const { error } = await supabase
        .from("service_categories")
        .update({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon || null,
          is_active: formData.is_active,
          category_type: formData.category_type
        })
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Failed to update category");
      } else {
        toast.success("Category updated");
        setShowDialog(false);
        resetForm();
        fetchCategories();
      }
    } else {
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.display_order || 0)) + 1 
        : 1;

      const { error } = await supabase
        .from("service_categories")
        .insert({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon || null,
          is_active: formData.is_active,
          display_order: maxOrder,
          category_type: formData.category_type
        });

      if (error) {
        toast.error("Failed to create category");
      } else {
        toast.success("Category created");
        setShowDialog(false);
        resetForm();
        fetchCategories();
      }
    }
  };

  const handleEdit = (category: ServiceCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "🔧",
      is_active: category.is_active ?? true,
      category_type: category.category_type || "standard"
    });
    setShowDialog(true);
  };

  const handleCustomizeFields = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setShowFieldsDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    const { error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete category");
    } else {
      toast.success("Category deleted");
      fetchCategories();
    }
  };

  const toggleActive = async (category: ServiceCategory) => {
    const { error } = await supabase
      .from("service_categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      toast.error("Failed to update category");
    } else {
      fetchCategories();
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      icon: "🔧",
      is_active: true,
      category_type: "standard"
    });
  };

  const getCategoryTypeLabel = (type: string | null) => {
    const found = CATEGORY_TYPES.find(t => t.value === type);
    return found?.label || 'Standard';
  };

  const commonIcons = ["🔧", "✂️", "🏠", "🚗", "✈️", "🏝️", "🎨", "📸", "💅", "🧹", "👨‍🏫", "🏋️", "🍳", "🎵", "💻", "🔌", "🛠️", "🌿"];

  if (loading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Service Categories</h2>
          <p className="text-sm text-muted-foreground">
            Manage booking categories and customize their fields
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl">{category.icon || "🔧"}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{category.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryTypeLabel(category.category_type)}
                      </Badge>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={category.is_active ?? false}
                    onCheckedChange={() => toggleActive(category)}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCustomizeFields(category)}
                    title="Customize Fields"
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    Fields
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No categories yet. Create your first one!</p>
          </Card>
        )}
      </div>

      {/* Add/Edit Category Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Category Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Travel & Tours"
                required
              />
            </div>

            <div>
              <Label>Category Type *</Label>
              <Select
                value={formData.category_type}
                onValueChange={(value) => setFormData({ ...formData, category_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Different types have different default fields. You can customize fields after creating.
              </p>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category"
                rows={2}
              />
            </div>

            <div>
              <Label>Icon</Label>
              <div className="flex gap-2 flex-wrap mt-2 mb-2">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    className={`text-2xl p-1 rounded hover:bg-muted ${formData.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : ''}`}
                    onClick={() => setFormData({ ...formData, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Enter custom emoji"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? "Update" : "Create"} Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customize Fields Dialog */}
      {selectedCategory && (
        <ServiceCategoryFieldsDialog
          open={showFieldsDialog}
          onOpenChange={setShowFieldsDialog}
          categoryId={selectedCategory.id}
          categoryName={selectedCategory.name}
        />
      )}
    </div>
  );
};

export default ServiceCategoryManagement;
