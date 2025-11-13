import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Image as ImageIcon, PackagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  commission_percentage: number;
  category_id: string | null;
  is_active: boolean;
  is_featured?: boolean;
  promo_price?: number;
  discount_percentage?: number;
  promo_active?: boolean;
  image_url?: string;
  stock_quantity?: number;
  diamond_reward?: number;
}

interface ProductCategory {
  id: string;
  name: string;
  icon: string | null;
}

interface ProductVariant {
  id: string;
  product_id: string;
  variant_type: 'size' | 'color' | 'weight';
  variant_value: string;
  price_adjustment: number;
  stock_quantity: number;
  sku?: string;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

export const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  
  // Bulk edit state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    base_price: "",
    category_id: "",
    stock_quantity: "",
    promo_price: "",
    discount_percentage: "",
    diamond_reward: "",
    is_active: undefined as boolean | undefined
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price: "",
    commission_percentage: "10",
    category_id: "",
    is_active: true,
    is_featured: false,
    promo_price: "",
    discount_percentage: "0",
    promo_active: false,
    image_url: "",
    stock_quantity: "0",
    diamond_reward: "0"
  });

  // Image form state
  const [imageUrl, setImageUrl] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  // Variant form state
  const [variantForm, setVariantForm] = useState({
    variant_type: "size" as 'size' | 'color' | 'weight',
    variant_value: "",
    price_adjustment: "0",
    stock_quantity: "0",
    sku: ""
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, icon")
      .eq("is_active", true)
      .order("display_order");

    if (error) {
      console.error("Failed to load categories", error);
    } else {
      setCategories(data || []);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data as any || []);
    }
    setLoading(false);
  };

  const fetchVariants = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("variant_type");

    if (error) {
      toast.error("Failed to load variants");
      console.error(error);
    } else {
      setVariants(data || []);
    }
  };

  const fetchImages = async (productId: string) => {
    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order");

    if (error) {
      toast.error("Failed to load images");
      console.error(error);
    } else {
      setImages(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      description: formData.description,
      base_price: parseFloat(formData.base_price),
      commission_percentage: parseFloat(formData.commission_percentage),
      category_id: formData.category_id || null,
      is_active: formData.is_active,
      promo_price: formData.promo_price ? parseFloat(formData.promo_price) : null,
      discount_percentage: parseInt(formData.discount_percentage),
      promo_active: formData.promo_active,
      image_url: formData.image_url || null,
      stock_quantity: parseInt(formData.stock_quantity),
      diamond_reward: parseInt(formData.diamond_reward) || 0
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Failed to update product");
        console.error(error);
        return;
      }
      toast.success("Product updated successfully");
    } else {
      const { error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        toast.error("Failed to create product");
        console.error(error);
        return;
      }
      toast.success("Product created successfully");
    }

    resetForm();
    fetchProducts();
    setIsDialogOpen(false);
  };

  const handleAddVariant = async () => {
    if (!selectedProduct) return;

    const variantData = {
      product_id: selectedProduct.id,
      variant_type: variantForm.variant_type,
      variant_value: variantForm.variant_value,
      price_adjustment: parseFloat(variantForm.price_adjustment),
      stock_quantity: parseInt(variantForm.stock_quantity),
      sku: variantForm.sku || null
    };

    const { error } = await supabase
      .from("product_variants")
      .insert([variantData]);

    if (error) {
      toast.error("Failed to add variant");
      console.error(error);
      return;
    }

    toast.success("Variant added successfully");
    setVariantForm({
      variant_type: "size",
      variant_value: "",
      price_adjustment: "0",
      stock_quantity: "0",
      sku: ""
    });
    fetchVariants(selectedProduct.id);
  };

  const handleAddImage = async (url?: string) => {
    if (!selectedProduct) return;
    
    const finalUrl = url || imageUrl;
    if (!finalUrl) return;

    const imageData = {
      product_id: selectedProduct.id,
      image_url: finalUrl,
      display_order: images.length,
      is_primary: isPrimary
    };

    const { error } = await supabase
      .from("product_images")
      .insert([imageData]);

    if (error) {
      toast.error("Failed to add image");
      console.error(error);
      return;
    }

    toast.success("Image added successfully");
    setImageUrl("");
    setIsPrimary(false);
    fetchImages(selectedProduct.id);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete product");
      console.error(error);
      return;
    }

    toast.success("Product deleted successfully");
    fetchProducts();
  };

  const handleDeleteVariant = async (id: string) => {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete variant");
      console.error(error);
      return;
    }

    toast.success("Variant deleted successfully");
    fetchVariants(selectedProduct!.id);
  };

  const handleDeleteImage = async (id: string) => {
    const { error } = await supabase
      .from("product_images")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete image");
      console.error(error);
      return;
    }

    toast.success("Image deleted successfully");
    fetchImages(selectedProduct!.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      base_price: "",
      commission_percentage: "10",
      category_id: "",
      is_active: true,
      is_featured: false,
      promo_price: "",
      discount_percentage: "0",
      promo_active: false,
      image_url: "",
      stock_quantity: "0",
      diamond_reward: "0"
    });
    setEditingProduct(null);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      base_price: product.base_price.toString(),
      commission_percentage: product.commission_percentage.toString(),
      category_id: product.category_id || "",
      is_active: product.is_active,
      is_featured: product.is_featured || false,
      promo_price: product.promo_price?.toString() || "",
      discount_percentage: product.discount_percentage?.toString() || "0",
      promo_active: product.promo_active || false,
      image_url: product.image_url || "",
      stock_quantity: product.stock_quantity?.toString() || "0",
      diamond_reward: product.diamond_reward?.toString() || "0"
    });
    setIsDialogOpen(true);
  };

  const openVariantsDialog = (product: Product) => {
    setSelectedProduct(product);
    fetchVariants(product.id);
    setVariantsDialogOpen(true);
  };

  const openImagesDialog = (product: Product) => {
    setSelectedProduct(product);
    fetchImages(product.id);
    setImagesDialogOpen(true);
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProductIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)));
    }
  };

  const handleBulkEdit = async () => {
    if (selectedProductIds.size === 0) {
      toast.error("No products selected");
      return;
    }

    const updates: any = {};
    if (bulkEditData.base_price) updates.base_price = parseFloat(bulkEditData.base_price);
    if (bulkEditData.category_id) updates.category_id = bulkEditData.category_id;
    if (bulkEditData.stock_quantity) updates.stock_quantity = parseInt(bulkEditData.stock_quantity);
    if (bulkEditData.promo_price) updates.promo_price = parseFloat(bulkEditData.promo_price);
    if (bulkEditData.discount_percentage) updates.discount_percentage = parseInt(bulkEditData.discount_percentage);
    if (bulkEditData.diamond_reward) updates.diamond_reward = parseInt(bulkEditData.diamond_reward);
    if (bulkEditData.is_active !== undefined) updates.is_active = bulkEditData.is_active;

    if (Object.keys(updates).length === 0) {
      toast.error("No changes to apply");
      return;
    }

    const productIds = Array.from(selectedProductIds);
    
    const { error } = await supabase
      .from("products")
      .update(updates)
      .in("id", productIds);

    if (error) {
      toast.error("Failed to update products");
      console.error(error);
      return;
    }

    toast.success(`Updated ${productIds.length} product(s)`);
    setSelectedProductIds(new Set());
    setIsBulkEditOpen(false);
    setBulkEditData({
      base_price: "",
      category_id: "",
      stock_quantity: "",
      promo_price: "",
      discount_percentage: "",
      diamond_reward: "",
      is_active: undefined
    });
    fetchProducts();
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Product Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="base_price">Base Price (₱)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => {
                      const newBasePrice = e.target.value;
                      setFormData({ ...formData, base_price: newBasePrice });
                      
                      if (formData.discount_percentage && parseFloat(formData.discount_percentage) > 0 && newBasePrice) {
                        const basePrice = parseFloat(newBasePrice);
                        const discount = parseFloat(formData.discount_percentage);
                        const promoPrice = basePrice - (basePrice * discount / 100);
                        setFormData(prev => ({ 
                          ...prev, 
                          base_price: newBasePrice,
                          promo_price: promoPrice.toFixed(2)
                        }));
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="commission_percentage">Commission (%)</Label>
                  <Input
                    id="commission_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock_quantity">Stock</Label>
                  <Input
                    id="stock_quantity"
                    type="number"
                    min="0"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="diamond_reward">💎 Diamond Reward</Label>
                  <Input
                    id="diamond_reward"
                    type="number"
                    min="0"
                    value={formData.diamond_reward}
                    onChange={(e) => setFormData({ ...formData, diamond_reward: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Diamonds awarded when purchased
                  </p>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <ImageUploadCrop
                onImageUploaded={(url) => setFormData({ ...formData, image_url: url })}
                currentImage={formData.image_url}
                maxSizeKB={500}
              />
              
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="promo_active" className="text-sm font-semibold">Promo Pricing</Label>
                  <Switch
                    id="promo_active"
                    checked={formData.promo_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, promo_active: checked })}
                  />
                </div>
                {formData.promo_active && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="discount_percentage">Discount (%)</Label>
                        <Input
                          id="discount_percentage"
                          type="number"
                          min="0"
                          max="100"
                          value={formData.discount_percentage}
                          onChange={(e) => {
                            const discount = e.target.value;
                            const basePrice = parseFloat(formData.base_price);
                            
                            if (discount && basePrice) {
                              const discountValue = parseFloat(discount);
                              const promoPrice = basePrice - (basePrice * discountValue / 100);
                              setFormData({ 
                                ...formData, 
                                discount_percentage: discount,
                                promo_price: promoPrice.toFixed(2)
                              });
                            } else {
                              setFormData({ ...formData, discount_percentage: discount });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="promo_price">Promo Price (₱)</Label>
                        <Input
                          id="promo_price"
                          type="number"
                          step="0.01"
                          value={formData.promo_price}
                          onChange={(e) => {
                            const promoPrice = e.target.value;
                            const basePrice = parseFloat(formData.base_price);
                            
                            if (promoPrice && basePrice) {
                              const promoPriceValue = parseFloat(promoPrice);
                              const discount = ((basePrice - promoPriceValue) / basePrice) * 100;
                              setFormData({ 
                                ...formData, 
                                promo_price: promoPrice,
                                discount_percentage: Math.max(0, discount).toFixed(0)
                              });
                            } else {
                              setFormData({ ...formData, promo_price: promoPrice });
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    {formData.base_price && formData.promo_price && (
                      <div className="p-2 bg-muted rounded text-xs space-y-1">
                        <div className="flex justify-between">
                          <span>Original:</span>
                          <span className="font-medium">₱{parseFloat(formData.base_price).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-destructive">
                          <span>Discount:</span>
                          <span className="font-medium">{formData.discount_percentage}% OFF</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="font-semibold">Promo:</span>
                          <span className="font-semibold text-primary">₱{parseFloat(formData.promo_price).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between border-t pt-3">
                <Label htmlFor="is_active">Product Active</Label>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label htmlFor="is_featured">⭐ Featured Product</Label>
                  <p className="text-xs text-muted-foreground">Display in featured section</p>
                </div>
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedProductIds.size > 0 && (
        <Card className="p-4 bg-accent/10 border-accent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{selectedProductIds.size} product(s) selected</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedProductIds(new Set())}>
                Clear Selection
              </Button>
            </div>
            <Button onClick={() => setIsBulkEditOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Bulk Edit
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedProductIds.size === products.length && products.length > 0}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>💎 Diamonds</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedProductIds.has(product.id)}
                    onChange={() => toggleSelectProduct(product.id)}
                    className="cursor-pointer"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>₱{product.base_price.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-primary/10">
                    💎 {product.diamond_reward || 0}
                  </Badge>
                </TableCell>
                <TableCell>{product.commission_percentage}%</TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openImagesDialog(product)}>
                      <ImageIcon className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openVariantsDialog(product)}>
                      <PackagePlus className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedProductIds.size} Products</DialogTitle>
            <DialogDescription>
              Leave fields empty to keep existing values
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="bulk_base_price">Base Price (₱)</Label>
                <Input
                  id="bulk_base_price"
                  type="number"
                  step="0.01"
                  placeholder="Keep existing"
                  value={bulkEditData.base_price}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, base_price: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bulk_stock">Stock Quantity</Label>
                <Input
                  id="bulk_stock"
                  type="number"
                  placeholder="Keep existing"
                  value={bulkEditData.stock_quantity}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, stock_quantity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="bulk_diamond_reward">💎 Diamond Reward</Label>
                <Input
                  id="bulk_diamond_reward"
                  type="number"
                  min="0"
                  placeholder="Keep existing"
                  value={bulkEditData.diamond_reward}
                  onChange={(e) => setBulkEditData({ ...bulkEditData, diamond_reward: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bulk_category">Category</Label>
              <Select
                value={bulkEditData.category_id}
                onValueChange={(value) => setBulkEditData({ ...bulkEditData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keep existing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keep existing</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-3">
              <Label className="text-sm font-semibold mb-2 block">Promotional Pricing</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="bulk_discount">Discount (%)</Label>
                  <Input
                    id="bulk_discount"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Keep existing"
                    value={bulkEditData.discount_percentage}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, discount_percentage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bulk_promo_price">Promo Price (₱)</Label>
                  <Input
                    id="bulk_promo_price"
                    type="number"
                    step="0.01"
                    placeholder="Keep existing"
                    value={bulkEditData.promo_price}
                    onChange={(e) => setBulkEditData({ ...bulkEditData, promo_price: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-sm font-semibold mb-2 block">Product Status</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={bulkEditData.is_active === true ? "default" : "outline"}
                  onClick={() => setBulkEditData({ ...bulkEditData, is_active: true })}
                >
                  Set Active
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulkEditData.is_active === false ? "default" : "outline"}
                  onClick={() => setBulkEditData({ ...bulkEditData, is_active: false })}
                >
                  Set Inactive
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={bulkEditData.is_active === undefined ? "default" : "outline"}
                  onClick={() => setBulkEditData({ ...bulkEditData, is_active: undefined })}
                >
                  Keep Existing
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBulkEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkEdit}>
                Apply Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Variants Dialog */}
      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Variants - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="p-3">
              <h3 className="font-semibold mb-3 text-sm">Add New Variant</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Variant Type</Label>
                  <Select
                    value={variantForm.variant_type}
                    onValueChange={(value: any) => setVariantForm({ ...variantForm, variant_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="size">Size</SelectItem>
                      <SelectItem value="color">Color</SelectItem>
                      <SelectItem value="weight">Weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    placeholder="e.g., Large, Red, 500g"
                    value={variantForm.variant_value}
                    onChange={(e) => setVariantForm({ ...variantForm, variant_value: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Price Adjustment (₱)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={variantForm.price_adjustment}
                    onChange={(e) => setVariantForm({ ...variantForm, price_adjustment: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Stock Quantity</Label>
                  <Input
                    type="number"
                    value={variantForm.stock_quantity}
                    onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label>SKU (Optional)</Label>
                  <Input
                    placeholder="Product SKU"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleAddVariant} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </Button>
            </Card>

            <div>
              <h3 className="font-semibold mb-2">Existing Variants</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Price Adj.</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell className="capitalize">{variant.variant_type}</TableCell>
                      <TableCell>{variant.variant_value}</TableCell>
                      <TableCell>₱{variant.price_adjustment.toFixed(2)}</TableCell>
                      <TableCell>{variant.stock_quantity}</TableCell>
                      <TableCell>{variant.sku || "-"}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteVariant(variant.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Images Dialog */}
      <Dialog open={imagesDialogOpen} onOpenChange={setImagesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Images - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Upload New Image</h3>
              <ImageUploadCrop
                onImageUploaded={(url) => handleAddImage(url)}
                maxSizeKB={300}
              />
              <div className="flex items-center justify-between mt-3">
                <Label className="text-sm">Set as Primary</Label>
                <Switch
                  checked={isPrimary}
                  onCheckedChange={setIsPrimary}
                />
              </div>
            </Card>

            <div>
              <h3 className="font-semibold mb-3 text-sm">Gallery ({images.length})</h3>
              {images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No images uploaded yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {images
                    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                    .map((image) => (
                      <Card key={image.id} className="group relative overflow-hidden">
                        <div className="aspect-square">
                          <img
                            src={image.image_url}
                            alt="Product"
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteImage(image.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {image.is_primary && (
                          <Badge className="absolute top-2 left-2 bg-primary">
                            Primary
                          </Badge>
                        )}
                      </Card>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};