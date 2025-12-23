import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Building2, 
  Package, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Ban,
  Eye,
  Edit,
  Percent,
  DollarSign,
  Image,
  Truck,
  Mail,
  Phone,
  MapPin,
  User,
  Settings,
  RefreshCw
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
  commission_rate: number | null;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
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
  admin_markup_percent: number | null;
  admin_markup_fixed: number | null;
  final_price: number | null;
  stock_quantity: number;
  min_order_quantity: number;
  unit: string;
  specifications: Record<string, string>;
  status: string;
  is_active: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  suppliers?: Supplier;
}

export default function SupplierManagement() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("suppliers");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);
  const [supplierDialog, setSupplierDialog] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [markupDialog, setMarkupDialog] = useState(false);
  const [markupPercent, setMarkupPercent] = useState("");
  const [markupFixed, setMarkupFixed] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch suppliers
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ["admin-suppliers", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Supplier[];
    }
  });

  // Fetch supplier products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-supplier-products", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("supplier_products")
        .select("*, suppliers(*)")
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SupplierProduct[];
    }
  });

  // Update supplier status
  const updateSupplierStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("suppliers")
        .update({ 
          status, 
          approved_at: status === "approved" ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
      toast.success("Supplier status updated");
      setSupplierDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update supplier: " + error.message);
    }
  });

  // Update product status
  const updateProductStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("supplier_products")
        .update({ 
          status, 
          approved_at: status === "approved" ? new Date().toISOString() : null 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-supplier-products"] });
      toast.success("Product status updated");
      setProductDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update product: " + error.message);
    }
  });

  // Update product markup
  const updateProductMarkup = useMutation({
    mutationFn: async ({ id, markupPercent, markupFixed, notes }: { 
      id: string; 
      markupPercent: number; 
      markupFixed: number;
      notes: string;
    }) => {
      const { error } = await supabase
        .from("supplier_products")
        .update({ 
          admin_markup_percent: markupPercent,
          admin_markup_fixed: markupFixed,
          admin_notes: notes
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-supplier-products"] });
      toast.success("Product markup updated");
      setMarkupDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update markup: " + error.message);
    }
  });

  // Publish product to shop
  const publishToShop = useMutation({
    mutationFn: async (product: SupplierProduct) => {
      const { error } = await supabase
        .from("products")
        .insert({
          name: product.name,
          description: product.description,
          base_price: product.final_price || product.supplier_price,
          image_url: product.images?.[0] || null,
          category: product.category_id || "general",
          sku: product.sku,
          stock_quantity: product.stock_quantity,
          is_active: true,
          seller_id: null // Admin-managed product
        });
      if (error) throw error;

      // Mark as published
      await supabase
        .from("supplier_products")
        .update({ status: "approved", is_active: true })
        .eq("id", product.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-supplier-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product published to shop!");
    },
    onError: (error) => {
      toast.error("Failed to publish: " + error.message);
    }
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      pending: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
      approved: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
      suspended: { variant: "outline", icon: <Ban className="w-3 h-3" /> },
      archived: { variant: "outline", icon: <Ban className="w-3 h-3" /> }
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge variant={style.variant} className="flex items-center gap-1 capitalize">
        {style.icon}
        {status}
      </Badge>
    );
  };

  const openMarkupDialog = (product: SupplierProduct) => {
    setSelectedProduct(product);
    setMarkupPercent(product.admin_markup_percent?.toString() || "0");
    setMarkupFixed(product.admin_markup_fixed?.toString() || "0");
    setAdminNotes(product.admin_notes || "");
    setMarkupDialog(true);
  };

  const stats = {
    totalSuppliers: suppliers.length,
    pendingSuppliers: suppliers.filter(s => s.status === "pending").length,
    approvedSuppliers: suppliers.filter(s => s.status === "approved").length,
    totalProducts: products.length,
    pendingProducts: products.filter(p => p.status === "pending").length,
    approvedProducts: products.filter(p => p.status === "approved").length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalSuppliers}</p>
                <p className="text-xs text-muted-foreground">Total Suppliers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingSuppliers}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.approvedSuppliers}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalProducts}</p>
                <p className="text-xs text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingProducts}</p>
                <p className="text-xs text-muted-foreground">Pending Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.approvedProducts}</p>
                <p className="text-xs text-muted-foreground">Live Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search suppliers or products..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-suppliers"] });
            queryClient.invalidateQueries({ queryKey: ["admin-supplier-products"] });
          }}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Suppliers ({filteredSuppliers.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products ({filteredProducts.length})
          </TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="mt-4">
          {loadingSuppliers ? (
            <div className="text-center py-8 text-muted-foreground">Loading suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No suppliers found</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredSuppliers.map(supplier => (
                  <Card key={supplier.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {supplier.logo_url ? (
                          <img src={supplier.logo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold truncate">{supplier.company_name}</h3>
                            {getStatusBadge(supplier.status)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{supplier.contact_email}</p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(supplier.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => { setSelectedSupplier(supplier); setSupplierDialog(true); }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {supplier.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => updateSupplierStatus.mutate({ id: supplier.id, status: "approved" })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => updateSupplierStatus.mutate({ id: supplier.id, status: "rejected" })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map(supplier => (
                      <TableRow key={supplier.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {supplier.logo_url ? (
                              <img src={supplier.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{supplier.company_name}</p>
                              <p className="text-sm text-muted-foreground">{supplier.contact_name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{supplier.contact_email}</p>
                            <p className="text-muted-foreground">{supplier.contact_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                        <TableCell>{supplier.commission_rate}%</TableCell>
                        <TableCell>{new Date(supplier.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setSelectedSupplier(supplier); setSupplierDialog(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {supplier.status === "pending" && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => updateSupplierStatus.mutate({ id: supplier.id, status: "approved" })}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => updateSupplierStatus.mutate({ id: supplier.id, status: "rejected" })}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {supplier.status === "approved" && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-yellow-600"
                                onClick={() => updateSupplierStatus.mutate({ id: supplier.id, status: "suspended" })}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-4">
          {loadingProducts ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-3">
                {filteredProducts.map(product => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold truncate">{product.name}</h3>
                            {getStatusBadge(product.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">SKU: {product.sku || "N/A"}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm">Supplier: ₱{product.supplier_price}</span>
                            <span className="text-primary font-bold">Final: ₱{product.final_price?.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            From: {(product.suppliers as Supplier)?.company_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openMarkupDialog(product)}
                        >
                          <Percent className="w-4 h-4 mr-1" />
                          Markup
                        </Button>
                        {product.status === "pending" && (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => updateProductStatus.mutate({ id: product.id, status: "approved" })}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => updateProductStatus.mutate({ id: product.id, status: "rejected" })}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {product.status === "approved" && (
                          <Button 
                            size="sm"
                            variant="secondary"
                            onClick={() => publishToShop.mutate(product)}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Publish
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Supplier Price</TableHead>
                      <TableHead>Markup</TableHead>
                      <TableHead>Final Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map(product => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img src={product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium truncate max-w-[200px]">{product.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{(product.suppliers as Supplier)?.company_name}</p>
                        </TableCell>
                        <TableCell>{product.sku || "—"}</TableCell>
                        <TableCell>₱{product.supplier_price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{product.admin_markup_percent || 0}%</p>
                            <p className="text-muted-foreground">+₱{product.admin_markup_fixed || 0}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          ₱{product.final_price?.toFixed(2)}
                        </TableCell>
                        <TableCell>{product.stock_quantity}</TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openMarkupDialog(product)}
                            >
                              <Percent className="w-4 h-4" />
                            </Button>
                            {product.status === "pending" && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => updateProductStatus.mutate({ id: product.id, status: "approved" })}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => updateProductStatus.mutate({ id: product.id, status: "rejected" })}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {product.status === "approved" && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => publishToShop.mutate(product)}
                              >
                                <Truck className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Supplier Details Dialog */}
      <Dialog open={supplierDialog} onOpenChange={setSupplierDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedSupplier.logo_url ? (
                  <img src={selectedSupplier.logo_url} alt="" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{selectedSupplier.company_name}</h2>
                  {getStatusBadge(selectedSupplier.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedSupplier.contact_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedSupplier.contact_email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedSupplier.contact_phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm truncate">{selectedSupplier.address || "N/A"}</span>
                </div>
              </div>

              {selectedSupplier.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedSupplier.description}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedSupplier.status === "pending" && (
                  <>
                    <Button 
                      className="flex-1"
                      onClick={() => updateSupplierStatus.mutate({ id: selectedSupplier.id, status: "approved" })}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Supplier
                    </Button>
                    <Button 
                      variant="destructive"
                      onClick={() => updateSupplierStatus.mutate({ id: selectedSupplier.id, status: "rejected" })}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedSupplier.status === "approved" && (
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateSupplierStatus.mutate({ id: selectedSupplier.id, status: "suspended" })}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    Suspend Supplier
                  </Button>
                )}
                {selectedSupplier.status === "suspended" && (
                  <Button 
                    className="flex-1"
                    onClick={() => updateSupplierStatus.mutate({ id: selectedSupplier.id, status: "approved" })}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Reactivate Supplier
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Markup Dialog */}
      <Dialog open={markupDialog} onOpenChange={setMarkupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Product Markup</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedProduct.images?.[0] ? (
                  <img src={selectedProduct.images[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">Supplier Price: ₱{selectedProduct.supplier_price}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Markup Percentage (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      value={markupPercent}
                      onChange={e => setMarkupPercent(e.target.value)}
                      className="pl-9"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fixed Markup (₱)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      value={markupFixed}
                      onChange={e => setMarkupFixed(e.target.value)}
                      className="pl-9"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Final Price Calculation:</p>
                <p className="text-lg font-bold text-primary">
                  ₱{(selectedProduct.supplier_price + (selectedProduct.supplier_price * (parseFloat(markupPercent) || 0) / 100) + (parseFloat(markupFixed) || 0)).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedProduct.supplier_price} + {markupPercent || 0}% + ₱{markupFixed || 0}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Admin Notes</Label>
                <Textarea 
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Internal notes about this product..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkupDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedProduct) {
                updateProductMarkup.mutate({
                  id: selectedProduct.id,
                  markupPercent: parseFloat(markupPercent) || 0,
                  markupFixed: parseFloat(markupFixed) || 0,
                  notes: adminNotes
                });
              }
            }}>
              Save Markup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
