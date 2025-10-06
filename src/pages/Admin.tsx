import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShoppingBag, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionManager } from "@/components/TransactionManager";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
}

const Admin = () => {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category: "",
    is_active: true,
  });

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/");
      toast.error("Access denied. Admin only.");
    }
  }, [isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchShopItems();
    }
  }, [isAdmin]);

  const fetchShopItems = async () => {
    const { data, error } = await supabase
      .from("shop_items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load shop items");
      return;
    }

    setShopItems(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      image_url: formData.image_url || null,
      category: formData.category || null,
      is_active: formData.is_active,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("shop_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Failed to update item");
        return;
      }
      toast.success("Item updated successfully");
    } else {
      const { error } = await supabase.from("shop_items").insert(itemData);

      if (error) {
        toast.error("Failed to create item");
        return;
      }
      toast.success("Item created successfully");
    }

    setIsDialogOpen(false);
    resetForm();
    fetchShopItems();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const { error } = await supabase.from("shop_items").delete().eq("id", id);

    if (error) {
      toast.error("Failed to delete item");
      return;
    }

    toast.success("Item deleted successfully");
    fetchShopItems();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      image_url: "",
      category: "",
      is_active: true,
    });
    setEditingItem(null);
  };

  const openEditDialog = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      image_url: item.image_url || "",
      category: item.category || "",
      is_active: item.is_active,
    });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-gradient-gold">Admin Panel</h1>
        </div>
      </div>

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Shop Items
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4">
          <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Shop Item" : "Add New Shop Item"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
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
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingItem ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
          </div>

          <div className="grid gap-4">
        {shopItems.map((item) => (
          <Card key={item.id} className="p-6">
            <div className="flex items-start gap-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{item.name}</h3>
                    {item.category && (
                      <p className="text-sm text-muted-foreground">
                        {item.category}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.is_active
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {item.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <p className="text-muted-foreground mt-2">{item.description}</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  ${item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => openEditDialog(item)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
            {shopItems.length === 0 && (
              <Card className="p-8 text-center">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No shop items yet. Create your first item!
                </p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
