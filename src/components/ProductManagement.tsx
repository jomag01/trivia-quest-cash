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

interface Product {
  id: string;
  name: string;
  description: string;
  base_price: number;
  commission_percentage: number;
  is_active: boolean;
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
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [variantsDialogOpen, setVariantsDialogOpen] = useState(false);
  const [imagesDialogOpen, setImagesDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    base_price: "",
    commission_percentage: "10",
    is_active: true
  });

  // Variant form state
  const [variantForm, setVariantForm] = useState({
    variant_type: "size" as 'size' | 'color' | 'weight',
    variant_value: "",
    price_adjustment: "0",
    stock_quantity: "0",
    sku: ""
  });

  // Image form state
  const [imageUrl, setImageUrl] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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
      setProducts(data || []);
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
      is_active: formData.is_active
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

  const handleAddImage = async () => {
    if (!selectedProduct || !imageUrl) return;

    const imageData = {
      product_id: selectedProduct.id,
      image_url: imageUrl,
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
      is_active: true
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
      is_active: product.is_active
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                Fill in the product details below. Commission percentage determines affiliate earnings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base_price">Base Price (₱)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
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
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProduct ? "Update" : "Create"} Product
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>₱{product.base_price.toFixed(2)}</TableCell>
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

      {/* Variants Dialog */}
      <Dialog open={variantsDialogOpen} onOpenChange={setVariantsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Variants - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Manage size, color, and weight variants for this product.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Add New Variant</h3>
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
            <DialogTitle>Product Images - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Add and manage product images. Mark one as primary for thumbnails.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Add New Image</h3>
              <div className="space-y-4">
                <div>
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isPrimary}
                    onCheckedChange={setIsPrimary}
                  />
                  <Label>Set as Primary Image</Label>
                </div>
                <Button onClick={handleAddImage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
              </div>
            </Card>

            <div>
              <h3 className="font-semibold mb-2">Existing Images</h3>
              <div className="grid grid-cols-2 gap-4">
                {images.map((image) => (
                  <Card key={image.id} className="p-4">
                    <img
                      src={image.image_url}
                      alt="Product"
                      className="w-full h-48 object-cover rounded mb-2"
                    />
                    <div className="flex justify-between items-center">
                      {image.is_primary && (
                        <Badge variant="default">Primary</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteImage(image.id)}
                        className="ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};