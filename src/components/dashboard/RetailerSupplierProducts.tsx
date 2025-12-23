import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Package, ShoppingBag, Link2, Share2, TrendingUp, 
  Facebook, Instagram, Twitter, ExternalLink, Copy, 
  Loader2, CheckCircle, AlertCircle, Star, Zap, Plus
} from "lucide-react";

interface SupplierProduct {
  id: string;
  name: string;
  description: string;
  images: string[];
  supplier_price: number;
  final_price: number;
  stock_quantity: number;
  suppliers: {
    company_name: string;
  };
}

interface RetailerAccess {
  id: string;
  supplier_product_id: string;
  max_stock_allowed: number;
  current_stock_allocated: number;
  total_sales: number;
  total_commission_earned: number;
  is_active: boolean;
  supplier_products: SupplierProduct;
}

interface StockLimit {
  step_number: number;
  step_name: string;
  max_products: number;
  max_stock_per_product: number;
  commission_percentage: number;
}

const socialPlatforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'from-blue-500 to-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, color: 'from-sky-400 to-blue-500' },
  { id: 'tiktok', name: 'TikTok', icon: Share2, color: 'from-gray-800 to-black' },
];

const RetailerSupplierProducts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("available");
  const [shareDialog, setShareDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SupplierProduct | null>(null);

  // Fetch user's stairstep rank
  const { data: userRank } = useQuery({
    queryKey: ["user-stairstep-rank", user?.id],
    queryFn: async () => {
      if (!user) return { current_step: 1 };
      const { data, error } = await supabase
        .from("affiliate_current_rank")
        .select("current_step")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data || { current_step: 1 };
    },
    enabled: !!user
  });

  // Fetch stock limits for user's rank
  const { data: stockLimit } = useQuery({
    queryKey: ["stock-limit", userRank?.current_step],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("retailer_stock_limits")
        .select("*")
        .eq("step_number", userRank?.current_step || 1)
        .maybeSingle();
      if (error) throw error;
      return data as StockLimit;
    },
    enabled: !!userRank
  });

  // Fetch available supplier products (approved ones)
  const { data: availableProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["available-supplier-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_products")
        .select(`
          id, name, description, images, supplier_price, final_price, stock_quantity,
          suppliers (company_name)
        `)
        .eq("status", "approved")
        .eq("is_active", true);
      if (error) throw error;
      return data as unknown as SupplierProduct[];
    }
  });

  // Fetch retailer's accessed products
  const { data: myProducts = [], isLoading: myProductsLoading } = useQuery({
    queryKey: ["my-retailer-products", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("retailer_supplier_access")
        .select(`
          *,
          supplier_products (
            id, name, description, images, supplier_price, final_price, stock_quantity,
            suppliers (company_name)
          )
        `)
        .eq("retailer_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data as unknown as RetailerAccess[];
    },
    enabled: !!user
  });

  // Fetch retailer's promotional links
  const { data: myLinks = [] } = useQuery({
    queryKey: ["my-promotional-links", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("retailer_promotional_links")
        .select("*")
        .eq("retailer_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ["my-retailer-commissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("retailer_supplier_commissions")
        .select("*")
        .eq("retailer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Add product to retailer's showcase
  const addToShowcase = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Not authenticated");
      
      // Check if already added
      const existing = myProducts.find(p => p.supplier_product_id === productId);
      if (existing) throw new Error("Product already in your showcase");

      // Check product limit
      if (myProducts.length >= (stockLimit?.max_products || 5)) {
        throw new Error(`You can only showcase ${stockLimit?.max_products || 5} products at your current rank`);
      }

      const { error } = await supabase
        .from("retailer_supplier_access")
        .insert({
          retailer_id: user.id,
          supplier_product_id: productId,
          max_stock_allowed: stockLimit?.max_stock_per_product || 10,
          is_active: true
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-retailer-products"] });
      toast.success("Product added to your showcase!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Generate promotional link
  const generateLink = useMutation({
    mutationFn: async ({ productId, platform }: { productId: string; platform: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      const linkCode = `${user.id.slice(0, 8)}-${productId.slice(0, 8)}-${platform}`;
      const fullLink = `${window.location.origin}/shop?product=${productId}&ref=${user.id}&platform=${platform}`;

      const { error } = await supabase
        .from("retailer_promotional_links")
        .upsert({
          retailer_id: user.id,
          supplier_product_id: productId,
          platform,
          link_code: linkCode,
          full_link: fullLink,
          is_active: true
        }, {
          onConflict: 'retailer_id,supplier_product_id,platform'
        });
      if (error) throw error;
      
      return fullLink;
    },
    onSuccess: (fullLink) => {
      queryClient.invalidateQueries({ queryKey: ["my-promotional-links"] });
      navigator.clipboard.writeText(fullLink);
      toast.success("Link copied to clipboard!");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied!");
  };

  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commission_amount), 0);
  const isProductInShowcase = (productId: string) => myProducts.some(p => p.supplier_product_id === productId);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Star className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white border-0">{stockLimit?.step_name || 'Bronze'}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2">Step {userRank?.current_step || 1}</p>
            <p className="text-sm text-violet-100">Your Rank</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <ShoppingBag className="w-8 h-8 opacity-80" />
            <p className="text-2xl font-bold mt-2">{myProducts.length}/{stockLimit?.max_products || 5}</p>
            <p className="text-sm text-emerald-100">Products Showcased</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
          <CardContent className="p-4">
            <Link2 className="w-8 h-8 opacity-80" />
            <p className="text-2xl font-bold mt-2">{myLinks.length}</p>
            <p className="text-sm text-blue-100">Active Links</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-4">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <p className="text-2xl font-bold mt-2">₱{totalCommissions.toFixed(2)}</p>
            <p className="text-sm text-amber-100">Total Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Rate Info */}
      <Alert className="border-violet-500/50 bg-gradient-to-r from-violet-50 to-purple-50">
        <Zap className="w-4 h-4 text-violet-600" />
        <AlertDescription className="text-violet-800">
          <span className="font-semibold">Your commission rate: {stockLimit?.commission_percentage || 5}%</span>
          <span className="ml-2 text-violet-600">| Max {stockLimit?.max_stock_per_product || 10} units per product</span>
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 bg-gradient-to-r from-violet-100 to-purple-100">
          <TabsTrigger value="available" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            Available Products
          </TabsTrigger>
          <TabsTrigger value="showcase" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            My Showcase
          </TabsTrigger>
          <TabsTrigger value="earnings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
            Earnings
          </TabsTrigger>
        </TabsList>

        {/* Available Products */}
        <TabsContent value="available" className="space-y-4 mt-4">
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
          ) : availableProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Available</h3>
              <p className="text-muted-foreground">Check back later for new supplier products</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all">
                  <div className="h-40 bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-12 h-12 text-violet-300" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2 text-xs">{product.suppliers?.company_name}</Badge>
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{product.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="font-bold text-violet-600">₱{(product.final_price || product.supplier_price).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</span>
                    </div>
                    <Button 
                      className="w-full mt-4 bg-gradient-to-r from-violet-600 to-purple-600"
                      onClick={() => addToShowcase.mutate(product.id)}
                      disabled={isProductInShowcase(product.id) || addToShowcase.isPending}
                    >
                      {isProductInShowcase(product.id) ? (
                        <><CheckCircle className="w-4 h-4 mr-2" />In Showcase</>
                      ) : (
                        <><Plus className="w-4 h-4 mr-2" />Add to Showcase</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Showcase */}
        <TabsContent value="showcase" className="space-y-4 mt-4">
          {myProductsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : myProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Your Showcase is Empty</h3>
              <p className="text-muted-foreground mb-4">Add products from the Available tab to start earning</p>
              <Button onClick={() => setActiveTab("available")} variant="outline">
                Browse Products
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myProducts.map((access) => (
                <Card key={access.id} className="overflow-hidden hover:shadow-lg transition-all">
                  <div className="h-40 bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center relative">
                    {access.supplier_products?.images?.[0] ? (
                      <img src={access.supplier_products.images[0]} alt={access.supplier_products?.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-12 h-12 text-emerald-300" />
                    )}
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-600">
                      {stockLimit?.commission_percentage || 5}% Commission
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate">{access.supplier_products?.name}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span>Sales: {access.total_sales}</span>
                      <span className="text-emerald-600 font-semibold">₱{access.total_commission_earned.toFixed(2)} earned</span>
                    </div>
                    <Button 
                      className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600"
                      onClick={() => {
                        setSelectedProduct(access.supplier_products);
                        setShareDialog(true);
                      }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share & Earn
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Earnings */}
        <TabsContent value="earnings" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Commission History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commissions.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No commissions yet. Start sharing products to earn!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commissions.map((commission) => (
                    <div key={commission.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">₱{Number(commission.commission_amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {commission.source === 'social_link' ? `Via ${commission.social_platform}` : 'Direct Sale'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                          {commission.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(commission.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Share Dialog */}
      <Dialog open={shareDialog} onOpenChange={setShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-violet-600" />
              Share Product
            </DialogTitle>
            <DialogDescription>
              Generate promotional links for social media
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {selectedProduct.images?.[0] ? (
                  <img src={selectedProduct.images[0]} alt="" className="w-12 h-12 rounded object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-violet-100 rounded flex items-center justify-center">
                    <Package className="w-6 h-6 text-violet-500" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">₱{(selectedProduct.final_price || selectedProduct.supplier_price).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {socialPlatforms.map((platform) => {
                  const existingLink = myLinks.find(
                    l => l.supplier_product_id === selectedProduct.id && l.platform === platform.id
                  );
                  
                  return (
                    <Button
                      key={platform.id}
                      variant="outline"
                      className={`flex-col h-auto py-4 hover:bg-gradient-to-r hover:${platform.color} hover:text-white hover:border-transparent transition-all`}
                      onClick={() => {
                        if (existingLink) {
                          copyLink(existingLink.full_link);
                        } else {
                          generateLink.mutate({ productId: selectedProduct.id, platform: platform.id });
                        }
                      }}
                    >
                      <platform.icon className="w-6 h-6 mb-2" />
                      <span className="text-xs">{platform.name}</span>
                      {existingLink && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">
                          {existingLink.click_count} clicks
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RetailerSupplierProducts;
