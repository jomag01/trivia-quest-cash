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
import { Loader2, Palette, Package, ShoppingBag, Plus, ExternalLink, Search, Image as ImageIcon, Shirt, RefreshCw } from 'lucide-react';
import { usePrintify } from '@/hooks/usePrintify';
import { toast } from 'sonner';

interface PrintOnDemandManagerProps {
  onProductCreated?: (product: { name: string; imageUrl: string; price: number }) => void;
}

export function PrintOnDemandManager({ onProductCreated }: PrintOnDemandManagerProps) {
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
  const [activeTab, setActiveTab] = useState('catalog');

  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    designUrl: '',
  });

  useEffect(() => {
    getShops();
  }, [getShops]);

  useEffect(() => {
    if (shops.length > 0 && !selectedShop) {
      setSelectedShop(shops[0].id);
    }
  }, [shops, selectedShop]);

  useEffect(() => {
    if (selectedShop) {
      getProducts(selectedShop);
    }
  }, [selectedShop, getProducts]);

  const handleLoadCatalog = async () => {
    await getCatalog();
  };

  const handleSelectBlueprint = async (blueprintId: number) => {
    setSelectedBlueprint(blueprintId);
    const providers = await getPrintProviders(blueprintId);
    if (providers?.length > 0) {
      setSelectedProvider(providers[0].id);
      const vars = await getVariants(blueprintId, providers[0].id);
      setVariants(vars?.variants || []);
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

    // Create product with selected variants
    const selectedVariants = variants.slice(0, 10).map(v => ({
      id: v.id,
      price: 2500, // Base price in cents ($25.00)
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
      getProducts(selectedShop);
      
      if (onProductCreated) {
        onProductCreated({
          name: productForm.title,
          imageUrl: productForm.designUrl,
          price: 25,
        });
      }
    }
  };

  const handlePublishProduct = async (productId: string) => {
    if (!selectedShop) return;
    await publishProduct(selectedShop, productId);
    getProducts(selectedShop);
  };

  const filteredBlueprints = blueprints.filter(bp =>
    bp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bp.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = [
    { id: 'shirts', name: 'T-Shirts', icon: Shirt },
    { id: 'hoodies', name: 'Hoodies', icon: Package },
    { id: 'mugs', name: 'Mugs', icon: ShoppingBag },
    { id: 'posters', name: 'Posters', icon: ImageIcon },
  ];

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
                        <cat.icon className="h-3 w-3" />
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
                  {products.map((product: any) => (
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
                          <div className="flex gap-2 mt-2">
                            <Badge variant={product.is_published ? 'default' : 'secondary'}>
                              {product.is_published ? 'Published' : 'Draft'}
                            </Badge>
                            {!product.is_published && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => handlePublishProduct(product.id)}
                                disabled={loading}
                              >
                                Publish
                              </Button>
                            )}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Product
            </DialogTitle>
            <DialogDescription>
              Add your design to create a custom product
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

            {variants.length > 0 && (
              <div>
                <Label>Available Variants</Label>
                <p className="text-sm text-muted-foreground">
                  {variants.length} sizes/colors available
                </p>
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
    </Card>
  );
}
