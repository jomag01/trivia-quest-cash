import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  Link as LinkIcon, 
  Upload, 
  Search, 
  Trash2, 
  Edit, 
  Check, 
  X,
  ShoppingBag,
  Globe,
  Package,
  Loader2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportedProduct {
  id: string;
  source: string;
  sourceUrl: string;
  name: string;
  description: string;
  originalPrice: number;
  sellingPrice: number;
  images: string[];
  category: string;
  variants?: string[];
  selected: boolean;
}

interface ProductCategory {
  id: string;
  name: string;
}

const SUPPORTED_PLATFORMS = [
  { id: "alibaba", name: "Alibaba", icon: "🏭", color: "bg-orange-500" },
  { id: "aliexpress", name: "AliExpress", icon: "🛒", color: "bg-red-500" },
  { id: "lazada", name: "Lazada", icon: "🛍️", color: "bg-blue-500" },
  { id: "shopee", name: "Shopee", icon: "🧡", color: "bg-orange-600" },
  { id: "temu", name: "Temu", icon: "🎁", color: "bg-amber-500" },
  { id: "amazon", name: "Amazon", icon: "📦", color: "bg-yellow-500" },
  { id: "tiktok", name: "TikTok Shop", icon: "🎵", color: "bg-black" },
];

export default function ProductImporter() {
  const [importMode, setImportMode] = useState<"single" | "bulk">("single");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [productUrl, setProductUrl] = useState("");
  const [bulkUrls, setBulkUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editingProduct, setEditingProduct] = useState<ImportedProduct | null>(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Fetch categories on mount
  useState(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true);
      if (data) setCategories(data);
    };
    fetchCategories();
  });

  const parseProductUrl = (url: string): { platform: string; productId: string } | null => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes("alibaba")) return { platform: "alibaba", productId: url };
      if (hostname.includes("aliexpress")) return { platform: "aliexpress", productId: url };
      if (hostname.includes("lazada")) return { platform: "lazada", productId: url };
      if (hostname.includes("shopee")) return { platform: "shopee", productId: url };
      if (hostname.includes("temu")) return { platform: "temu", productId: url };
      if (hostname.includes("amazon")) return { platform: "amazon", productId: url };
      if (hostname.includes("tiktok")) return { platform: "tiktok", productId: url };
      
      return null;
    } catch {
      return null;
    }
  };

  const fetchProductFromUrl = async (url: string): Promise<ImportedProduct | null> => {
    const parsed = parseProductUrl(url);
    if (!parsed) {
      toast.error("Unsupported platform URL");
      return null;
    }

    const platformName = SUPPORTED_PLATFORMS.find(p => p.id === parsed.platform)?.name || parsed.platform;
    
    try {
      // Call the Edge Function to scrape real product data
      const { data, error } = await supabase.functions.invoke('scrape-product', {
        body: { url }
      });

      if (error) {
        console.error('Scrape error:', error);
        toast.error(`Failed to fetch from ${platformName}. Please customize manually.`);
        // Return a placeholder if scraping fails
        return {
          id: crypto.randomUUID(),
          source: parsed.platform,
          sourceUrl: url,
          name: `Imported Product from ${platformName}`,
          description: "Product description - customize this after import",
          originalPrice: 0,
          sellingPrice: 0,
          images: [],
          category: "",
          variants: [],
          selected: true
        };
      }

      if (data?.success && data?.product) {
        const product = data.product;
        return {
          id: crypto.randomUUID(),
          source: parsed.platform,
          sourceUrl: url,
          name: product.name || `Imported Product from ${platformName}`,
          description: product.description || "",
          originalPrice: product.price || 0,
          sellingPrice: product.price || 0,
          images: product.images || [],
          category: "",
          variants: product.variants || [],
          selected: true
        };
      }

      // Fallback if no product data
      return {
        id: crypto.randomUUID(),
        source: parsed.platform,
        sourceUrl: url,
        name: `Imported Product from ${platformName}`,
        description: "Product description - customize this after import",
        originalPrice: 0,
        sellingPrice: 0,
        images: [],
        category: "",
        variants: [],
        selected: true
      };
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(`Error fetching from ${platformName}`);
      return null;
    }
  };

  const handleSingleImport = async () => {
    if (!productUrl.trim()) {
      toast.error("Please enter a product URL");
      return;
    }

    setLoading(true);
    try {
      const product = await fetchProductFromUrl(productUrl.trim());
      if (product) {
        setImportedProducts(prev => [...prev, product]);
        setProductUrl("");
        toast.success("Product added to import queue");
      }
    } catch (error) {
      toast.error("Failed to fetch product");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    const urls = bulkUrls
      .split("\n")
      .map(u => u.trim())
      .filter(u => u.length > 0);

    if (urls.length === 0) {
      toast.error("Please enter product URLs");
      return;
    }

    setLoading(true);
    const newProducts: ImportedProduct[] = [];

    for (const url of urls) {
      try {
        const product = await fetchProductFromUrl(url);
        if (product) {
          newProducts.push(product);
        }
      } catch {
        console.error("Failed to fetch:", url);
      }
    }

    setImportedProducts(prev => [...prev, ...newProducts]);
    setBulkUrls("");
    toast.success(`Added ${newProducts.length} products to import queue`);
    setLoading(false);
  };

  const toggleProductSelection = (id: string) => {
    setImportedProducts(prev =>
      prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p)
    );
  };

  const removeProduct = (id: string) => {
    setImportedProducts(prev => prev.filter(p => p.id !== id));
  };

  const openCustomize = (product: ImportedProduct) => {
    setEditingProduct({ ...product });
    setIsCustomizeOpen(true);
  };

  const saveCustomization = () => {
    if (!editingProduct) return;
    
    setImportedProducts(prev =>
      prev.map(p => p.id === editingProduct.id ? editingProduct : p)
    );
    setIsCustomizeOpen(false);
    setEditingProduct(null);
    toast.success("Product customized");
  };

  const importSelectedProducts = async () => {
    const selected = importedProducts.filter(p => p.selected);
    
    if (selected.length === 0) {
      toast.error("No products selected for import");
      return;
    }

    // Validate products have required fields
    const invalidProducts = selected.filter(p => !p.name || p.sellingPrice <= 0);
    if (invalidProducts.length > 0) {
      toast.error("Please customize all products with name and price before importing");
      return;
    }

    setLoading(true);
    let successCount = 0;

    for (const product of selected) {
      const { error } = await supabase.from("products").insert({
        name: product.name,
        description: product.description,
        base_price: product.sellingPrice,
        image_url: product.images[0] || null,
        category_id: product.category || null,
        is_active: true,
        stock_quantity: 0,
        commission_percentage: 10
      });

      if (!error) {
        successCount++;
      } else {
        console.error("Failed to import product:", error);
      }
    }

    // Remove imported products from queue
    setImportedProducts(prev => prev.filter(p => !p.selected));
    toast.success(`Successfully imported ${successCount} product(s)`);
    setLoading(false);
  };

  const getPlatformInfo = (platformId: string) => {
    return SUPPORTED_PLATFORMS.find(p => p.id === platformId) || { icon: "📦", name: platformId, color: "bg-gray-500" };
  };

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Supported Platforms
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {SUPPORTED_PLATFORMS.map(platform => (
            <Button
              key={platform.id}
              variant={selectedPlatform === platform.id ? "default" : "outline"}
              className="flex flex-col items-center gap-1 h-auto py-3"
              onClick={() => setSelectedPlatform(platform.id)}
            >
              <span className="text-2xl">{platform.icon}</span>
              <span className="text-xs">{platform.name}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Import Mode Tabs */}
      <Tabs value={importMode} onValueChange={(v) => setImportMode(v as "single" | "bulk")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="single" className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Single Import
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-4">
          <Card className="p-4">
            <Label>Product URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Paste product URL from any supported platform..."
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSingleImport} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Fetch
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Paste a product link from Alibaba, AliExpress, Lazada, Shopee, Temu, Amazon, or TikTok Shop
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card className="p-4">
            <Label>Product URLs (one per line)</Label>
            <Textarea
              placeholder="https://www.aliexpress.com/item/...&#10;https://shopee.ph/...&#10;https://www.lazada.com.ph/..."
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              rows={6}
              className="mt-2"
            />
            <div className="flex justify-between items-center mt-3">
              <p className="text-xs text-muted-foreground">
                {bulkUrls.split("\n").filter(u => u.trim()).length} URLs entered
              </p>
              <Button onClick={handleBulkImport} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                Import All
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Queue */}
      {importedProducts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="w-5 h-5" />
              Import Queue ({importedProducts.length})
            </h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportedProducts([])}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={importSelectedProducts}
                disabled={loading || !importedProducts.some(p => p.selected)}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                Import Selected
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={importedProducts.every(p => p.selected)}
                      onChange={() => {
                        const allSelected = importedProducts.every(p => p.selected);
                        setImportedProducts(prev => prev.map(p => ({ ...p, selected: !allSelected })));
                      }}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importedProducts.map(product => {
                  const platform = getPlatformInfo(product.source);
                  const isValid = product.name && product.sellingPrice > 0;
                  
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={product.selected}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge className={`${platform.color} text-white`}>
                          {platform.icon} {platform.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{product.name}</p>
                          <a
                            href={product.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            View Original <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.sellingPrice > 0 ? (
                          <span className="font-medium">₱{product.sellingPrice.toLocaleString()}</span>
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isValid ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Check className="w-3 h-3 mr-1" /> Ready
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            <AlertCircle className="w-3 h-3 mr-1" /> Needs Setup
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCustomize(product)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Customize Dialog */}
      <Dialog open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize Product</DialogTitle>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4">
              <div>
                <Label>Product Name *</Label>
                <Input
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={3}
                  placeholder="Enter product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Original Price</Label>
                  <Input
                    type="number"
                    value={editingProduct.originalPrice || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, originalPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Selling Price *</Label>
                  <Input
                    type="number"
                    value={editingProduct.sellingPrice || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={editingProduct.category}
                  onValueChange={(v) => setEditingProduct({ ...editingProduct, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Product Image URL</Label>
                <Input
                  value={editingProduct.images[0] || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: [e.target.value] })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCustomizeOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveCustomization}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {importedProducts.length === 0 && (
        <Card className="p-8 text-center">
          <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No Products to Import</h3>
          <p className="text-muted-foreground text-sm">
            Paste product URLs from supported platforms to start importing products to your store.
          </p>
        </Card>
      )}
    </div>
  );
}