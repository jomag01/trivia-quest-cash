import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Building2, Package, Upload, CheckCircle, Clock, XCircle, 
  Plus, Edit, Trash2, Image, Loader2, TrendingUp, Star
} from "lucide-react";

interface SupplierProduct {
  id: string;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category_id: string;
  images: string[];
  supplier_price: number;
  stock_quantity: number;
  min_order_quantity: number;
  unit: string;
  status: string;
  final_price?: number;
  admin_notes?: string;
  created_at: string;
}

const SupplierApplication = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [registerDialog, setRegisterDialog] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<SupplierProduct | null>(null);
  const [activeTab, setActiveTab] = useState("products");

  const [supplierForm, setSupplierForm] = useState({
    company_name: "",
    contact_name: "",
    contact_phone: "",
    address: "",
    description: ""
  });

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

  // Fetch supplier profile
  const { data: supplier, isLoading: supplierLoading } = useQuery({
    queryKey: ["my-supplier", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch supplier products
  const { data: products = [], isLoading: productsLoading } = useQuery({
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
    enabled: !!supplier?.id
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
          contact_email: user.email,
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
      min_order_quantity: product.min_order_quantity?.toString() || "1",
      unit: product.unit || "piece"
    });
    setProductDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-gradient-to-r from-emerald-500 to-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-gradient-to-r from-amber-400 to-orange-500 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (supplierLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not yet a supplier - show registration form
  if (!supplier) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white">
            <Building2 className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center">Become a Supplier</h2>
            <p className="text-center text-violet-100 mt-2">
              Join our marketplace and start selling your products to retailers
            </p>
          </div>
          <CardContent className="p-6 space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Company Name *</Label>
                <Input 
                  value={supplierForm.company_name}
                  onChange={e => setSupplierForm(prev => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Your company name"
                  className="border-purple-200 focus:border-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Contact Person</Label>
                  <Input 
                    value={supplierForm.contact_name}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contact_name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Phone Number</Label>
                  <Input 
                    value={supplierForm.contact_phone}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Business Address</Label>
                <Textarea 
                  value={supplierForm.address}
                  onChange={e => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full business address"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Business Description</Label>
                <Textarea 
                  value={supplierForm.description}
                  onChange={e => setSupplierForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your products and services..."
                  rows={3}
                />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-violet-800 mb-2">Benefits of being a Supplier:</h4>
              <ul className="text-sm text-violet-700 space-y-1">
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Reach thousands of retailers</li>
                <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" />Scale your business nationwide</li>
                <li className="flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" />Easy inventory management</li>
              </ul>
            </div>

            <Button 
              onClick={() => registerSupplier.mutate()}
              disabled={!supplierForm.company_name || registerSupplier.isPending}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {registerSupplier.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Application
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Supplier exists - show portal
  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                {supplier.company_name}
              </h1>
              <p className="text-muted-foreground text-sm">Supplier Portal</p>
            </div>
          </div>
          {getStatusBadge(supplier.status)}
        </div>
      </div>

      {supplier.status === "pending" && (
        <Alert className="mb-6 border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50">
          <Clock className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Your supplier application is under review. You can start adding products while waiting for approval.
          </AlertDescription>
        </Alert>
      )}

      {supplier.status === "rejected" && (
        <Alert className="mb-6 border-red-500/50 bg-gradient-to-r from-red-50 to-rose-50">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Your application was not approved. {supplier.notes && `Reason: ${supplier.notes}`}
          </AlertDescription>
        </Alert>
      )}

      {supplier.status === "approved" && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6 bg-gradient-to-r from-violet-100 to-purple-100">
            <TabsTrigger value="products" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              My Products
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {/* Add Product Button */}
            <div className="flex justify-end">
              <Button 
                onClick={() => { resetProductForm(); setProductDialog(true); }}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-40 bg-muted rounded-t-lg" />
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded mb-2 w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-2 border-violet-200">
                <Package className="w-16 h-16 mx-auto text-violet-300 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Products Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your first product to start selling</p>
                <Button 
                  onClick={() => setProductDialog(true)}
                  variant="outline"
                  className="border-violet-500 text-violet-600 hover:bg-violet-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="h-40 bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center relative">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-12 h-12 text-violet-300" />
                      )}
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(product.status)}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold truncate">{product.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-violet-600">₱{product.supplier_price.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" onClick={() => openEditProduct(product)} className="flex-1">
                          <Edit className="w-3 h-3 mr-1" />Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => deleteProduct.mutate(product.id)}
                          className="flex-1"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Coming Soon</h3>
              <p className="text-muted-foreground">Analytics and insights about your products will be available here.</p>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-600" />
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
            <DialogDescription>
              Fill in the product details below
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input 
                value={productForm.name}
                onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={productForm.description}
                onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Product description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input 
                  value={productForm.sku}
                  onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Barcode</Label>
                <Input 
                  value={productForm.barcode}
                  onChange={e => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                  placeholder="Barcode"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier Price (₱) *</Label>
                <Input 
                  type="number"
                  value={productForm.supplier_price}
                  onChange={e => setProductForm(prev => ({ ...prev, supplier_price: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity *</Label>
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
                <Input 
                  value={productForm.unit}
                  onChange={e => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="piece, kg, box"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => saveProduct.mutate()}
              disabled={!productForm.name || !productForm.supplier_price || saveProduct.isPending}
              className="bg-gradient-to-r from-violet-600 to-purple-600"
            >
              {saveProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProduct ? "Update" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierApplication;
