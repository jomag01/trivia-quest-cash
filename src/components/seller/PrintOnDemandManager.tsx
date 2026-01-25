import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Palette, Package, ShoppingBag, Plus, Search, Image as ImageIcon, Shirt, RefreshCw, Edit, DollarSign, Percent } from 'lucide-react';
import { usePrintify } from '@/hooks/usePrintify';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PrintOnDemandManagerProps {
  onProductCreated?: (product: { name: string; imageUrl: string; price: number }) => void;
}

interface VariantPricing {
  id: number;
  title: string;
  printifyCost: number;
  sellerPrice: number;
  isEnabled: boolean;
}

interface PODProduct {
  id: string;
  title: string;
  description: string;
  images: { src: string }[];
  variants: { id: number; title: string; price: number; cost?: number }[];
  is_published: boolean;
  localProductId?: string;
  printifyProductId?: string;
  adminMarkup?: number;
}

interface LocalPodData {
  id: string;
  product_id: string;
  printify_product_id: string;
  printify_shop_id: number;
  admin_markup_percentage: number;
  product?: {
    approval_status?: string;
  };
}

export function PrintOnDemandManager({ onProductCreated }: PrintOnDemandManagerProps) {
  const { user } = useAuth();
  const {
    loading,
    shops,
    blueprints,
    products,
    printProviders,
    getShops,
    getCatalog,
    getPrintProviders,
    getVariants,
    getProducts,
    getProduct,
    createProduct,
    publishProduct,
    uploadImage,
  } = usePrintify();

  const [selectedShop, setSelectedShop] = useState<number | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog');
  const [syncing, setSyncing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PODProduct | null>(null);
  const [localPodProducts, setLocalPodProducts] = useState<Map<string, LocalPodData>>(new Map());

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    designUrl: '',
  });

  const [variantPricing, setVariantPricing] = useState<VariantPricing[]>([]);
  const [adminMarkup, setAdminMarkup] = useState(20);

  useEffect(() => {
    getShops();
    loadLocalPodProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (shops.length > 0 && !selectedShop) {
      setSelectedShop(shops[0].id);
    }
  }, [shops, selectedShop]);

  useEffect(() => {
    if (selectedShop) {
      getProducts(selectedShop);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShop]);

  const loadLocalPodProducts = async () => {
    const { data } = await supabase
      .from('printify_products')
      .select('*, product:products(approval_status)');
    
    if (data) {
      const map = new Map<string, LocalPodData>();
      data.forEach((pp) => {
        map.set(pp.printify_product_id, pp as unknown as LocalPodData);
      });
      setLocalPodProducts(map);
    }
  };

  const handleLoadCatalog = async () => {
    await getCatalog();
  };

  const handleSelectBlueprint = async (blueprintId: number) => {
    setSelectedBlueprint(blueprintId);
    const providers = await getPrintProviders(blueprintId);
    if (providers?.length > 0) {
      setSelectedProvider(providers[0].id);
      const vars = await getVariants(blueprintId, providers[0].id);
      if (vars?.variants) {
        setVariants(vars.variants);
        // Initialize variant pricing
        setVariantPricing(vars.variants.slice(0, 10).map((v: any) => ({
          id: v.id,
          title: v.title,
          printifyCost: v.cost || 1500, // Default cost in cents
          sellerPrice: 2500, // Default seller price
          isEnabled: true,
        })));
      }
    }
    setShowCreateDialog(true);
  };

  const handleCreateProduct = async () => {
    if (!selectedShop || !selectedBlueprint || !selectedProvider || !productForm.title) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Upload design image first
    let printAreaImage = null;
    if (productForm.designUrl) {
      const uploaded = await uploadImage(`design-${Date.now()}.png`, { url: productForm.designUrl });
      if (uploaded?.id) {
        printAreaImage = uploaded.id;
      }
    }

    // Create product with selected variants and pricing
    const selectedVariants = variantPricing
      .filter(v => v.isEnabled)
      .map(v => ({
        id: v.id,
        price: v.sellerPrice, // Price in cents
        is_enabled: true,
      }));

    const product = {
      title: productForm.title,
      description: productForm.description,
      blueprint_id: selectedBlueprint,
      print_provider_id: selectedProvider,
      variants: selectedVariants,
      print_areas: printAreaImage ? [
        {
          variant_ids: selectedVariants.map(v => v.id),
          placeholders: [
            {
              position: 'front',
              images: [{ id: printAreaImage, x: 0.5, y: 0.5, scale: 1, angle: 0 }]
            }
          ]
        }
      ] : [],
    };

    const created = await createProduct(selectedShop, product);
    if (created) {
      setShowCreateDialog(false);
      setProductForm({ title: '', description: '', designUrl: '' });
      setVariantPricing([]);
      getProducts(selectedShop);
      
      if (onProductCreated) {
        onProductCreated({
          name: productForm.title,
          imageUrl: productForm.designUrl,
          price: variantPricing[0]?.sellerPrice / 100 || 25,
        });
      }
    }
  };

  const handlePublishAndSync = async (printifyProduct: PODProduct) => {
    if (!selectedShop || !user) return;
    setSyncing(true);

    try {
      // First publish to Printify
      await publishProduct(selectedShop, printifyProduct.id);

      // Get full product details from Printify
      const fullProduct = await getProduct(selectedShop, printifyProduct.id);
      if (!fullProduct) throw new Error('Failed to get product details');

      // Calculate base price (lowest variant price with admin markup)
      const lowestPrice = Math.min(...(fullProduct.variants || []).map((v: any) => v.price || 2500));
      const basePrice = Math.round(lowestPrice * (1 + adminMarkup / 100)) / 100;

      // Create local product
      const { data: localProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: fullProduct.title,
          description: fullProduct.description || '',
          base_price: basePrice,
          image_url: fullProduct.images?.[0]?.src || '',
          seller_id: user.id,
          is_active: false, // Needs admin approval
          is_pod: true,
          approval_status: 'pending',
          admin_markup_percentage: adminMarkup,
          stock_quantity: 999, // POD has unlimited stock
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create printify_products link
      const { data: podLink, error: linkError } = await supabase
        .from('printify_products')
        .insert({
          product_id: localProduct.id,
          printify_product_id: printifyProduct.id,
          printify_shop_id: selectedShop,
          blueprint_id: selectedBlueprint,
          print_provider_id: selectedProvider,
          printify_data: fullProduct,
          admin_markup_percentage: adminMarkup,
          is_synced: true,
        })
        .select()
        .single();

      if (linkError) throw linkError;

      // Create variant records
      const variantRecords = (fullProduct.variants || []).map((v: any) => ({
        printify_product_id: podLink.id,
        variant_id: v.id,
        variant_title: v.title,
        printify_cost: v.cost || 1500,
        seller_price: v.price || 2500,
        admin_markup_percentage: adminMarkup,
        final_price: Math.round((v.price || 2500) * (1 + adminMarkup / 100)),
        is_enabled: v.is_enabled !== false,
      }));

      if (variantRecords.length > 0) {
        const { error: variantError } = await supabase
          .from('printify_variants')
          .insert(variantRecords);
        
        if (variantError) console.error('Variant insert error:', variantError);
      }

      toast.success('Product published and synced to shop!');
      loadLocalPodProducts();
      getProducts(selectedShop);

    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync product');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditProduct = async (printifyProduct: PODProduct) => {
    const localData = localPodProducts.get(printifyProduct.id);
    
    // Load variant pricing from database or use defaults
    if (localData) {
      const { data: variants } = await supabase
        .from('printify_variants')
        .select('*')
        .eq('printify_product_id', localData.id);

      if (variants) {
        setVariantPricing(variants.map((v: any) => ({
          id: v.variant_id,
          title: v.variant_title,
          printifyCost: v.printify_cost,
          sellerPrice: v.seller_price,
          isEnabled: v.is_enabled,
        })));
      }
      setAdminMarkup(localData.admin_markup_percentage || 20);
    } else {
      // Use Printify data for non-synced products
      setVariantPricing((printifyProduct.variants || []).map(v => ({
        id: v.id,
        title: v.title,
        printifyCost: v.cost || 1500,
        sellerPrice: v.price || 2500,
        isEnabled: true,
      })));
    }

    setEditingProduct({
      ...printifyProduct,
      localProductId: localData?.product_id,
      printifyProductId: localData?.id,
      adminMarkup: localData?.admin_markup_percentage || 20,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setSyncing(true);

    try {
      const localData = localPodProducts.get(editingProduct.id);
      
      if (localData) {
        // Update local product price
        const lowestPrice = Math.min(...variantPricing.filter(v => v.isEnabled).map(v => v.sellerPrice));
        const basePrice = Math.round(lowestPrice * (1 + adminMarkup / 100)) / 100;

        await supabase
          .from('products')
          .update({
            base_price: basePrice,
            admin_markup_percentage: adminMarkup,
          })
          .eq('id', localData.product_id);

        // Update POD link
        await supabase
          .from('printify_products')
          .update({ admin_markup_percentage: adminMarkup })
          .eq('id', localData.id);

        // Update variants
        for (const v of variantPricing) {
          await supabase
            .from('printify_variants')
            .update({
              seller_price: v.sellerPrice,
              admin_markup_percentage: adminMarkup,
              final_price: Math.round(v.sellerPrice * (1 + adminMarkup / 100)),
              is_enabled: v.isEnabled,
            })
            .eq('printify_product_id', localData.id)
            .eq('variant_id', v.id);
        }

        toast.success('Product updated!');
        loadLocalPodProducts();
      }

      setShowEditDialog(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update');
    } finally {
      setSyncing(false);
    }
  };

  const updateVariantPrice = (variantId: number, newPrice: number) => {
    setVariantPricing(prev => prev.map(v => 
      v.id === variantId ? { ...v, sellerPrice: newPrice } : v
    ));
  };

  const toggleVariant = (variantId: number) => {
    setVariantPricing(prev => prev.map(v => 
      v.id === variantId ? { ...v, isEnabled: !v.isEnabled } : v
    ));
  };

  const filteredBlueprints = blueprints.filter(bp =>
    bp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bp.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: 'shirts', name: 'T-Shirts', Icon: Shirt },
    { id: 'hoodies', name: 'Hoodies', Icon: Package },
    { id: 'mugs', name: 'Mugs', Icon: ShoppingBag },
    { id: 'posters', name: 'Posters', Icon: ImageIcon },
  ] as const;

  const enrichedProducts = products.map((p: any) => ({
    ...p,
    localData: localPodProducts.get(p.id),
    isSynced: localPodProducts.has(p.id),
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Palette className="h-5 w-5 text-purple-500" />
          Print-on-Demand
        </CardTitle>
        <CardDescription>
          Create custom products with Printify - no inventory needed
        </CardDescription>
      </CardHeader>
      <CardContent>
        {shops.length === 0 ? (
          <div className="text-center py-8">
            <Shirt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Loading your Printify shops...</p>
            <Button onClick={getShops} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Connect Printify
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="catalog">Product Catalog</TabsTrigger>
              <TabsTrigger value="products">My Products ({products.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="catalog" className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleLoadCatalog} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">Load Catalog</span>
                </Button>
              </div>

              {blueprints.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Click "Load Catalog" to browse 900+ products
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {categories.map(cat => (
                      <Badge key={cat.id} variant="secondary" className="gap-1">
                        <cat.Icon className="h-3 w-3" />
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredBlueprints.slice(0, 50).map(bp => (
                      <Card
                        key={bp.id}
                        className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                        onClick={() => handleSelectBlueprint(bp.id)}
                      >
                        <div className="aspect-square bg-muted">
                          {bp.images?.[0] ? (
                            <img
                              src={bp.images[0]}
                              alt={bp.title}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Shirt className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium truncate">{bp.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{bp.brand}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="products" className="space-y-4 mt-4">
              {products.length === 0 ? (
                <div className="text-center py-8 border rounded-lg border-dashed">
                  <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No products yet. Create your first product from the catalog!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrichedProducts.map((product: any) => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-3 flex gap-3">
                        {product.images?.[0]?.src && (
                          <img
                            src={product.images[0].src}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.variants?.length || 0} variants
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant={product.is_published ? 'default' : 'secondary'}>
                              {product.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            {product.isSynced && (
                              <Badge variant="outline" className="text-primary border-primary">
                                Synced to Shop
                              </Badge>
                            )}
                            {product.localData?.product?.approval_status === 'pending' && (
                              <Badge variant="outline" className="text-accent border-accent">
                                Pending Approval
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {!product.isSynced && product.is_published && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                onClick={() => handlePublishAndSync(product)}
                                disabled={syncing}
                              >
                                {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShoppingBag className="h-3 w-3 mr-1" />}
                                Sync to Shop
                              </Button>
                            )}
                            {!product.is_published && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handlePublishAndSync(product)}
                                disabled={syncing}
                              >
                                {syncing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Publish & Sync
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => handleEditProduct(product)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit Pricing
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      {/* Create Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Product
            </DialogTitle>
            <DialogDescription>
              Add your design and set pricing for each variant
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Product Title *</Label>
              <Input
                value={productForm.title}
                onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                placeholder="My Custom T-Shirt"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={productForm.description}
                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                placeholder="Product description..."
                rows={3}
              />
            </div>

            <div>
              <Label>Design Image URL</Label>
              <Input
                value={productForm.designUrl}
                onChange={(e) => setProductForm({ ...productForm, designUrl: e.target.value })}
                placeholder="https://example.com/my-design.png"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a transparent PNG for best results
              </p>
            </div>

            {printProviders.length > 0 && (
              <div>
                <Label>Print Provider</Label>
                <Select
                  value={selectedProvider?.toString()}
                  onValueChange={(v) => setSelectedProvider(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {printProviders.map((pp: any) => (
                      <SelectItem key={pp.id} value={pp.id.toString()}>
                        {pp.title} ({pp.location?.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {variantPricing.length > 0 && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Variant Pricing (in cents)
                </Label>
                <ScrollArea className="h-[200px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {variantPricing.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Switch
                          checked={v.isEnabled}
                          onCheckedChange={() => toggleVariant(v.id)}
                        />
                        <span className="text-xs flex-1 truncate">{v.title}</span>
                        <Input
                          type="number"
                          value={v.sellerPrice}
                          onChange={(e) => updateVariantPrice(v.id, parseInt(e.target.value) || 0)}
                          className="w-24 h-8 text-xs"
                          disabled={!v.isEnabled}
                        />
                        <span className="text-xs text-muted-foreground">
                          ₱{(v.sellerPrice / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProduct} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit POD Product
            </DialogTitle>
            <DialogDescription>
              Update variant pricing and admin markup
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                {editingProduct.images?.[0]?.src && (
                  <img
                    src={editingProduct.images[0].src}
                    alt={editingProduct.title}
                    className="w-20 h-20 object-cover rounded"
                  />
                )}
                <div>
                  <p className="font-medium">{editingProduct.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {variantPricing.length} variants
                  </p>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Admin Markup (%)
                </Label>
                <Input
                  type="number"
                  value={adminMarkup}
                  onChange={(e) => setAdminMarkup(parseInt(e.target.value) || 0)}
                  min={0}
                  max={100}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This percentage will be added on top of seller prices
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4" />
                  Variant Pricing
                </Label>
                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  <div className="space-y-2">
                    {variantPricing.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <Switch
                          checked={v.isEnabled}
                          onCheckedChange={() => toggleVariant(v.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{v.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Cost: ₱{(v.printifyCost / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Input
                            type="number"
                            value={v.sellerPrice}
                            onChange={(e) => updateVariantPrice(v.id, parseInt(e.target.value) || 0)}
                            className="w-24 h-7 text-xs"
                            disabled={!v.isEnabled}
                          />
                          <span className="text-xs text-primary">
                            Final: ₱{((v.sellerPrice * (1 + adminMarkup / 100)) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={syncing}>
              {syncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}