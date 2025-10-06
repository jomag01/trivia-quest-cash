import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShoppingBag, Receipt, Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionManager } from "@/components/TransactionManager";
import { OrderManager } from "@/components/OrderManager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUp, ArrowDown } from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  is_draft: boolean;
}

interface ProductVariation {
  id?: string;
  size?: string;
  weight?: string;
  color?: string;
  price_adjustment: number;
  stock_quantity: number;
  sku?: string;
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [currentVariation, setCurrentVariation] = useState<ProductVariation>({
    size: "",
    weight: "",
    color: "",
    price_adjustment: 0,
    stock_quantity: 0,
    sku: "",
  });
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return formData.image_url || null;

    setUploading(true);
    try {
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'png';
      const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const filePath = `items/${unique}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: imageFile.type || `image/${ext}`,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      const msg = typeof error?.message === 'string' ? error.message : 'Failed to upload image';
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = false) => {
    e.preventDefault();

    const imageUrl = await uploadImage();
    if (imageFile && !imageUrl) {
      return; // Upload failed
    }

    const itemData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      image_url: imageUrl,
      category: formData.category || null,
      is_active: formData.is_active,
      is_draft: isDraft,
    };

    let shopItemId: string;

    if (editingItem) {
      const { error } = await supabase
        .from("shop_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Failed to update item");
        return;
      }
      shopItemId = editingItem.id;
      setCurrentItemId(editingItem.id);
      
      // Delete old variations and insert new ones
      await supabase
        .from("product_variations")
        .delete()
        .eq("shop_item_id", shopItemId);
        
      toast.success(isDraft ? "Draft saved successfully" : "Item updated successfully");
    } else {
      const { data, error } = await supabase
        .from("shop_items")
        .insert(itemData)
        .select()
        .single();

      if (error) {
        toast.error("Failed to create item");
        return;
      }
      
      if (data) {
        shopItemId = data.id;
        setCurrentItemId(data.id);
        setEditingItem(data as ShopItem);
      } else {
        toast.error("Failed to create item");
        return;
      }
      toast.success(isDraft ? "Draft saved successfully" : "Item created successfully");
    }

    // Save variations if any
    if (variations.length > 0) {
      const variationsData = variations.map((v) => ({
        shop_item_id: shopItemId,
        size: v.size || null,
        weight: v.weight || null,
        color: v.color || null,
        price_adjustment: v.price_adjustment,
        stock_quantity: v.stock_quantity,
        sku: v.sku || null,
      }));

      const { error: varError } = await supabase
        .from("product_variations")
        .insert(variationsData);

      if (varError) {
        toast.error("Failed to save variations");
        console.error(varError);
      }
    }

    // Don't close dialog or reset form if it's a draft - allow adding variations
    if (!isDraft) {
      setIsDialogOpen(false);
      resetForm();
    }
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
    setImageFile(null);
    setImagePreview("");
    setCurrentItemId(null);
    setVariations([]);
    setCurrentVariation({
      size: "",
      weight: "",
      color: "",
      price_adjustment: 0,
      stock_quantity: 0,
      sku: "",
    });
  };

  const openEditDialog = async (item: ShopItem) => {
    setEditingItem(item);
    setCurrentItemId(item.id);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      image_url: item.image_url || "",
      category: item.category || "",
      is_active: item.is_active,
    });
    setImagePreview(item.image_url || "");
    
    // Load existing variations
    const { data: variationsData } = await supabase
      .from("product_variations")
      .select("*")
      .eq("shop_item_id", item.id);
    
    if (variationsData) {
      setVariations(variationsData);
    }
    
    setIsDialogOpen(true);
  };

  const addVariation = () => {
    if (!currentVariation.size && !currentVariation.weight && !currentVariation.color) {
      toast.error("Please fill in at least one variation field (size, weight, or color)");
      return;
    }
    setVariations([...variations, { ...currentVariation }]);
    setCurrentVariation({
      size: "",
      weight: "",
      color: "",
      price_adjustment: 0,
      stock_quantity: 0,
      sku: "",
    });
    toast.success("Variation added");
  };

  const removeVariation = (index: number) => {
    setVariations(variations.filter((_, i) => i !== index));
    toast.success("Variation removed");
  };

  const scrollToTop = () => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ 
        top: scrollViewportRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
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
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Orders
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
          <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Shop Item" : "Add New Shop Item"}
              </DialogTitle>
            </DialogHeader>
            <div className="relative flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden">
                <div 
                  ref={scrollViewportRef}
                  className="h-full overflow-y-auto pr-4 scroll-smooth"
                >
                  <div className="space-y-4 pb-4">
                  <form id="shop-item-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
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
                      <Label htmlFor="image">Product Image</Label>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {imagePreview && (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="mt-2 w-32 h-32 object-cover rounded border"
                        />
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload a product image (JPG, PNG, WEBP)
                      </p>
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

                    {/* Product Variations Section */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-lg font-semibold mb-3">Product Variations</h3>
                      
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <Label htmlFor="var_size">Size</Label>
                          <Input
                            id="var_size"
                            value={currentVariation.size}
                            onChange={(e) =>
                              setCurrentVariation({ ...currentVariation, size: e.target.value })
                            }
                            placeholder="e.g., S, M, L, XL"
                          />
                        </div>
                        <div>
                          <Label htmlFor="var_weight">Weight</Label>
                          <Input
                            id="var_weight"
                            value={currentVariation.weight}
                            onChange={(e) =>
                              setCurrentVariation({ ...currentVariation, weight: e.target.value })
                            }
                            placeholder="e.g., 100g, 1kg"
                          />
                        </div>
                        <div>
                          <Label htmlFor="var_color">Color</Label>
                          <Input
                            id="var_color"
                            value={currentVariation.color}
                            onChange={(e) =>
                              setCurrentVariation({ ...currentVariation, color: e.target.value })
                            }
                            placeholder="e.g., Red, Blue"
                          />
                        </div>
                        <div>
                          <Label htmlFor="var_price">Price Adjustment</Label>
                          <Input
                            id="var_price"
                            type="number"
                            step="0.01"
                            value={currentVariation.price_adjustment}
                            onChange={(e) =>
                              setCurrentVariation({ ...currentVariation, price_adjustment: parseFloat(e.target.value) || 0 })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="var_stock">Stock Quantity</Label>
                          <Input
                            id="var_stock"
                            type="number"
                            value={currentVariation.stock_quantity}
                            onChange={(e) =>
                              setCurrentVariation({ ...currentVariation, stock_quantity: parseInt(e.target.value) || 0 })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="var_sku">SKU</Label>
                          <Input
                            id="var_sku"
                            value={currentVariation.sku}
                            onChange={(e) =>
                              setCurrentVariation({ ...currentVariation, sku: e.target.value })
                            }
                            placeholder="Optional SKU"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addVariation}
                        className="w-full mb-3"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Variation
                      </Button>

                      {variations.length > 0 && (
                        <div className="space-y-2">
                          <Label>Added Variations ({variations.length})</Label>
                          {variations.map((variation, index) => (
                            <Card key={index} className="p-3">
                              <div className="flex justify-between items-start">
                                <div className="text-sm space-y-1">
                                  {variation.size && <p><strong>Size:</strong> {variation.size}</p>}
                                  {variation.weight && <p><strong>Weight:</strong> {variation.weight}</p>}
                                  {variation.color && <p><strong>Color:</strong> {variation.color}</p>}
                                  {variation.price_adjustment !== 0 && (
                                    <p><strong>Price Adj:</strong> ${variation.price_adjustment.toFixed(2)}</p>
                                  )}
                                  <p><strong>Stock:</strong> {variation.stock_quantity}</p>
                                  {variation.sku && <p><strong>SKU:</strong> {variation.sku}</p>}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeVariation(index)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </form>
                </div>
                </div>
              </div>
              
              <div className="absolute right-6 bottom-20 flex flex-col gap-2 z-10">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full shadow-lg"
                  onClick={scrollToTop}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="rounded-full shadow-lg"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="h-4 w-4" />
                 </Button>
               </div>
             </div>
             
             <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={uploading}
              >
                Save as Draft
              </Button>
              <Button
                type="submit"
                form="shop-item-form"
                className="flex-1"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : editingItem ? "Update" : "Create"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
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
                    {item.is_draft && (
                      <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-600">
                        Draft
                      </span>
                    )}
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

        <TabsContent value="orders">
          <OrderManager />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
