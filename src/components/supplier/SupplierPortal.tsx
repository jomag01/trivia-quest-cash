import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Building2, 
  Package, 
  Plus, 
  Upload,
  Trash2,
  Edit,
  Save,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Hash,
  Boxes,
  FileText,
  ArrowLeft
} from "lucide-react";

interface Supplier {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  description: string | null;
  logo_url: string | null;
  status: string;
  created_at: string;
}

interface SupplierProduct {
  id: string;
  supplier_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  category_id: string | null;
  images: string[];
  supplier_price: number;
  stock_quantity: number;
  min_order_quantity: number;
  unit: string;
  specifications: Record<string, string>;
  status: string;
  is_active: boolean;
  created_at: string;
}

interface SupplierPortalProps {
  onBack?: () => void;
}

export default function SupplierPortal({ onBack }: SupplierPortalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const [productDialog, setProductDialog] = useState(false);
  const [registerDialog, setRegisterDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  
  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    category_id: "",
    images: [] as string[],
    supplier_price: "",
    stock_quantity: "",
    min_order_quantity: "1",
    unit: "piece"
  });

  const [supplierForm, setSupplierForm] = useState({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    address: "",
    description: ""
  });

  // Check if user is a supplier
  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ["my-supplier", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Supplier | null;
    },
    enabled: !!user
  });

  // Fetch supplier products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["my-supplier-products", supplier?.id],
    queryFn: async () => {
      if (!supplier) return [];
      const { data, error } = await supabase
        .from("supplier_products")
        .select("*")
        .eq("supplier_id", supplier.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SupplierProduct[];
    },
    enabled: !!supplier
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["supplier-product-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) return [];
      return data || [];
    }
  });

  // Register as supplier
  const registerSupplier = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("suppliers")
        .insert({
          user_id: user.id,
          company_name: supplierForm.company_name,
          contact_name: supplierForm.contact_name,
          contact_email: supplierForm.contact_email || user.email,
          contact_phone: supplierForm.contact_phone,
          address: supplierForm.address,
          description: supplierForm.description,
          status: "pending"
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-supplier"] });
      toast.success("Application submitted! We'll review it shortly.");
      setRegisterDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to submit application: " + error.message);
    }
  });

  // Create/Update product
  const saveProduct = useMutation({
    mutationFn: async () => {
      if (!supplier) throw new Error("No supplier profile");
      
      const productData = {
        supplier_id: supplier.id,
        name: productForm.name,
        description: productForm.description,
        sku: productForm.sku,
        barcode: productForm.barcode,
        category_id: productForm.category_id || null,
        images: productForm.images,
        supplier_price: parseFloat(productForm.supplier_price),
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        min_order_quantity: parseInt(productForm.min_order_quantity) || 1,
        unit: productForm.unit,
        status: "pending"
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("supplier_products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplier_products")
          .insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-supplier-products"] });
      toast.success(editingProduct ? "Product updated!" : "Product added!");
      setProductDialog(false);
      resetProductForm();
    },
    onError: (error) => {
      toast.error("Failed to save product: " + error.message);
    }
  });

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("supplier_products")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-supplier-products"] });
      toast.success("Product deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    }
  });

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      sku: "",
      barcode: "",
      category_id: "",
      images: [],
      supplier_price: "",
      stock_quantity: "",
      min_order_quantity: "1",
      unit: "piece"
    });
    setEditingProduct(null);
  };

  const openEditProduct = (product: SupplierProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      category_id: product.category_id || "",
      images: product.images || [],
      supplier_price: product.supplier_price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      min_order_quantity: product.min_order_quantity.toString(),
      unit: product.unit
    });
    setProductDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
      approved: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> }
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge variant={style.variant} className="flex items-center gap-1 capitalize">
        {style.icon}
        {status}
      </Badge>
    );
  };

  // Handle image URL input (simplified - in production would use file upload)
  const addImageUrl = (url: string) => {
    if (url && !productForm.images.includes(url)) {
      setProductForm(prev => ({
        ...prev,
        images: [...prev.images, url]
      }));
    }
  };

  const removeImage = (index: number) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  if (loadingSupplier) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Not a supplier yet - show registration
  if (!supplier) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <Building2 className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl">Become a Supplier</CardTitle>
            <CardDescription>
              Join our marketplace and start selling your products to our customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input 
                  value={supplierForm.company_name}
                  onChange={e => setSupplierForm(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Person</Label>
                  <Input 
                    value={supplierForm.contact_name}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    value={supplierForm.contact_phone}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Business Address</Label>
                <Textarea 
                  value={supplierForm.address}
                  onChange={e => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Complete business address"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Business Description</Label>
                <Textarea 
                  value={supplierForm.description}
                  onChange={e => setSupplierForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell us about your business and products..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              {onBack && (
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button 
                className="flex-1"
                onClick={() => registerSupplier.mutate()}
                disabled={!supplierForm.company_name || registerSupplier.isPending}
              >
                {registerSupplier.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pending approval
  if (supplier.status === "pending") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <Clock className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl">Application Under Review</CardTitle>
            <CardDescription>
              Your supplier application is being reviewed by our team. We'll notify you once it's approved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{supplier.company_name}</p>
              <p className="text-sm text-muted-foreground">Submitted on {new Date(supplier.created_at).toLocaleDateString()}</p>
            </div>
            {onBack && (
              <Button variant="outline" className="mt-4" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rejected
  if (supplier.status === "rejected") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle className="text-2xl">Application Not Approved</CardTitle>
            <CardDescription>
              Unfortunately, your supplier application was not approved at this time. Please contact support for more information.
            </CardDescription>
          </CardHeader>
          {onBack && (
            <CardContent>
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  // Approved - show supplier portal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">{supplier.company_name}</h1>
            <p className="text-muted-foreground">Supplier Portal</p>
          </div>
          {getStatusBadge(supplier.status)}
        </div>
        <Button onClick={() => { resetProductForm(); setProductDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{products.filter(p => p.status === "pending").length}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{products.filter(p => p.status === "approved").length}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Boxes className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{products.reduce((acc, p) => acc + p.stock_quantity, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      {loadingProducts ? (
        <div className="text-center py-8 text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No products yet</h3>
            <p className="text-muted-foreground mb-4">Start adding your products to the catalog</p>
            <Button onClick={() => { resetProductForm(); setProductDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <Card key={product.id} className="overflow-hidden">
              <div className="aspect-square bg-muted relative">
                {product.images?.[0] ? (
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  {getStatusBadge(product.status)}
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold truncate">{product.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{product.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-lg font-bold text-primary">₱{product.supplier_price.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">{product.stock_quantity} in stock</span>
                </div>
                {product.sku && (
                  <p className="text-xs text-muted-foreground mt-1">SKU: {product.sku}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditProduct(product)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete this product?")) {
                        deleteProduct.mutate(product.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialog} onOpenChange={(open) => { if (!open) resetProductForm(); setProductDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              Fill in the product details. All products will be reviewed before being listed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input 
                  value={productForm.name}
                  onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={productForm.category_id} 
                  onValueChange={value => setProductForm(prev => ({ ...prev, category_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={productForm.description}
                onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    value={productForm.sku}
                    onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="SKU"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input 
                  value={productForm.barcode}
                  onChange={e => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Barcode"
                />
              </div>
              <div className="space-y-2">
                <Label>Price *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    type="number"
                    value={productForm.supplier_price}
                    onChange={e => setProductForm(prev => ({ ...prev, supplier_price: e.target.value }))}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Stock Qty</Label>
                <Input 
                  type="number"
                  value={productForm.stock_quantity}
                  onChange={e => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order Qty</Label>
                <Input 
                  type="number"
                  value={productForm.min_order_quantity}
                  onChange={e => setProductForm(prev => ({ ...prev, min_order_quantity: e.target.value }))}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select 
                  value={productForm.unit} 
                  onValueChange={value => setProductForm(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">Piece</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="dozen">Dozen</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Product Images</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter image URL and press Add"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addImageUrl((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={(e) => {
                    const input = (e.target as HTMLElement).parentElement?.querySelector('input');
                    if (input) {
                      addImageUrl(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {productForm.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {productForm.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt="" 
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => saveProduct.mutate()}
              disabled={!productForm.name || !productForm.supplier_price || saveProduct.isPending}
            >
              {saveProduct.isPending ? "Saving..." : (editingProduct ? "Update Product" : "Add Product")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
