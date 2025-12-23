import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Plus, Edit, Trash2, ChevronUp, ChevronDown,
  Home, Car, Package, Hotel, BedDouble, Building, 
  Tag, ShoppingBag, Briefcase, Gift, Smartphone, Laptop
} from "lucide-react";

interface MarketplaceCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  display_order: number;
  is_active: boolean;
}

const ICON_OPTIONS = [
  { value: 'Building', label: 'Building', icon: Building },
  { value: 'Car', label: 'Car', icon: Car },
  { value: 'Package', label: 'Package', icon: Package },
  { value: 'Home', label: 'Home', icon: Home },
  { value: 'BedDouble', label: 'Bed', icon: BedDouble },
  { value: 'Hotel', label: 'Hotel', icon: Hotel },
  { value: 'Tag', label: 'Tag', icon: Tag },
  { value: 'ShoppingBag', label: 'Shopping Bag', icon: ShoppingBag },
  { value: 'Briefcase', label: 'Briefcase', icon: Briefcase },
  { value: 'Gift', label: 'Gift', icon: Gift },
  { value: 'Smartphone', label: 'Smartphone', icon: Smartphone },
  { value: 'Laptop', label: 'Laptop', icon: Laptop },
];

const COLOR_OPTIONS = [
  { value: 'from-blue-500 to-blue-600', label: 'Blue' },
  { value: 'from-red-500 to-red-600', label: 'Red' },
  { value: 'from-green-500 to-green-600', label: 'Green' },
  { value: 'from-purple-500 to-purple-600', label: 'Purple' },
  { value: 'from-orange-500 to-orange-600', label: 'Orange' },
  { value: 'from-pink-500 to-pink-600', label: 'Pink' },
  { value: 'from-yellow-500 to-yellow-600', label: 'Yellow' },
  { value: 'from-cyan-500 to-cyan-600', label: 'Cyan' },
  { value: 'from-indigo-500 to-indigo-600', label: 'Indigo' },
  { value: 'from-teal-500 to-teal-600', label: 'Teal' },
];

const getIconComponent = (iconName: string) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption?.icon || Package;
};

export default function MarketplaceCategoryManagement() {
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MarketplaceCategory | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    label: '',
    icon: 'Package',
    color: 'from-blue-500 to-blue-600',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      id: '',
      label: '',
      icon: 'Package',
      color: 'from-blue-500 to-blue-600',
    });
    setShowDialog(true);
  };

  const handleOpenEdit = (category: MarketplaceCategory) => {
    setEditingCategory(category);
    setFormData({
      id: category.id,
      label: category.label,
      icon: category.icon,
      color: category.color,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.label) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("marketplace_categories")
          .update({
            label: formData.label,
            icon: formData.icon,
            color: formData.color,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Category updated successfully");
      } else {
        const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
        const { error } = await supabase
          .from("marketplace_categories")
          .insert({
            id: formData.id.toLowerCase().replace(/\s+/g, '_'),
            label: formData.label,
            icon: formData.icon,
            color: formData.color,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast.success("Category created successfully");
      }

      setShowDialog(false);
      fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast.error(error.message || "Failed to save category");
    }
  };

  const handleToggleActive = async (category: MarketplaceCategory) => {
    try {
      const { error } = await supabase
        .from("marketplace_categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;
      toast.success(`Category ${category.is_active ? 'disabled' : 'enabled'}`);
      fetchCategories();
    } catch (error: any) {
      console.error("Error toggling category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDelete = async (category: MarketplaceCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.label}"?`)) return;

    try {
      const { error } = await supabase
        .from("marketplace_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
      toast.success("Category deleted successfully");
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleMoveOrder = async (category: MarketplaceCategory, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === category.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const targetCategory = categories[targetIndex];
    
    try {
      await Promise.all([
        supabase
          .from("marketplace_categories")
          .update({ display_order: targetCategory.display_order })
          .eq("id", category.id),
        supabase
          .from("marketplace_categories")
          .update({ display_order: category.display_order })
          .eq("id", targetCategory.id),
      ]);

      fetchCategories();
    } catch (error: any) {
      console.error("Error reordering categories:", error);
      toast.error("Failed to reorder categories");
    }
  };

  // Mobile card view for a single category
  const CategoryCard = ({ category, index }: { category: MarketplaceCategory; index: number }) => {
    const IconComponent = getIconComponent(category.icon);
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-card">
        {/* Header with icon and label */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center shrink-0`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{category.label}</div>
              <div className="text-xs text-muted-foreground truncate">{category.id}</div>
            </div>
          </div>
          <Badge variant={category.is_active ? "default" : "secondary"} className="shrink-0">
            {category.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Icon:</span>
            <Badge variant="outline" className="text-xs">{category.icon}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Color:</span>
            <div className={`w-8 h-4 rounded bg-gradient-to-r ${category.color}`} />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleMoveOrder(category, 'up')}
              disabled={index === 0}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleMoveOrder(category, 'down')}
              disabled={index === categories.length - 1}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground ml-1">#{index + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={category.is_active}
              onCheckedChange={() => handleToggleActive(category)}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleOpenEdit(category)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              onClick={() => handleDelete(category)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading categories...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4">
        <CardTitle className="text-lg sm:text-xl">Marketplace Categories</CardTitle>
        <Button onClick={handleOpenCreate} size="sm" className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No categories yet. Click "Add Category" to create one.
          </div>
        ) : (
          <>
            {/* Mobile view: Cards */}
            <div className="grid gap-3 md:hidden">
              {categories.map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
            </div>

            {/* Tablet/Desktop view: Table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Order</TableHead>
                    <TableHead className="min-w-[200px]">Category</TableHead>
                    <TableHead className="w-24">Icon</TableHead>
                    <TableHead className="w-24">Color</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category, index) => {
                    const IconComponent = getIconComponent(category.icon);
                    return (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveOrder(category, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveOrder(category, 'down')}
                              disabled={index === categories.length - 1}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center shrink-0`}>
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{category.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{category.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{category.icon}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className={`w-16 h-5 rounded bg-gradient-to-r ${category.color}`} />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={() => handleToggleActive(category)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenEdit(category)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(category)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Category ID (unique identifier)</Label>
                <Input
                  placeholder="e.g., electronics"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  disabled={!!editingCategory}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Label</Label>
                <Input
                  placeholder="e.g., Electronics & Gadgets"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {opt.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color Theme</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(value) => setFormData({ ...formData, color: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded bg-gradient-to-r ${opt.value}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Preview */}
              <div className="pt-2 border-t">
                <Label className="text-muted-foreground text-xs">Preview</Label>
                <div className="flex items-center gap-3 mt-2 p-3 rounded-lg bg-muted/50">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${formData.color} flex items-center justify-center`}>
                    {(() => {
                      const IconComp = getIconComponent(formData.icon);
                      return <IconComp className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <div className="font-semibold">{formData.label || 'Category Name'}</div>
                    <div className="text-xs text-muted-foreground">{formData.id || 'category_id'}</div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} className="w-full sm:w-auto">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
