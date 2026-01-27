import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Package, UtensilsCrossed, Gavel, Store, Search, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromotableItem {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  is_promotable: boolean;
  commission_tier: string;
  referral_commission_diamonds: number;
  type: 'product' | 'food' | 'auction' | 'marketplace';
}

export default function PromotableItemsManagement() {
  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["admin-promotable-products", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, image_url, base_price, is_promotable, commission_tier, referral_commission_diamonds")
        .eq("is_active", true)
        .order("is_promotable", { ascending: false })
        .order("name")
        .limit(100);
      
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data.map(p => ({ ...p, price: p.base_price, type: 'product' as const }));
    },
  });

  // Fetch food items
  const { data: foodItems = [], isLoading: loadingFood } = useQuery({
    queryKey: ["admin-promotable-food", searchTerm],
    queryFn: async () => {
      let query = (supabase as any)
        .from("food_items")
        .select("id, name, image_url, price, is_promotable, commission_tier, referral_commission_diamonds, vendor:food_vendors(name)")
        .eq("is_available", true)
        .order("is_promotable", { ascending: false })
        .order("name")
        .limit(100);
      
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((f: any) => ({ 
        ...f, 
        type: 'food' as const,
        vendorName: f.vendor?.name 
      }));
    },
  });

  // Fetch auctions
  const { data: auctions = [], isLoading: loadingAuctions } = useQuery({
    queryKey: ["admin-promotable-auctions", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("auctions")
        .select("id, title, images, starting_bid, current_bid, is_promotable, commission_tier")
        .in("status", ["active", "pending"])
        .order("is_promotable", { ascending: false })
        .order("title")
        .limit(100);
      
      if (searchTerm) {
        query = query.ilike("title", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((a: any) => ({ 
        id: a.id,
        name: a.title,
        image_url: a.images?.[0] || null,
        price: a.current_bid || a.starting_bid,
        is_promotable: a.is_promotable || false,
        commission_tier: a.commission_tier || 'standard',
        referral_commission_diamonds: 0,
        type: 'auction' as const
      }));
    },
  });

  // Fetch marketplace listings
  const { data: marketplaceItems = [], isLoading: loadingMarketplace } = useQuery({
    queryKey: ["admin-promotable-marketplace", searchTerm],
    queryFn: async () => {
      let query = (supabase as any)
        .from("marketplace_listings")
        .select("id, title, thumbnail_url, images, price, is_promotable, commission_tier, referral_commission_diamonds")
        .eq("status", "active")
        .order("is_promotable", { ascending: false })
        .order("title")
        .limit(100);
      
      if (searchTerm) {
        query = query.ilike("title", `%${searchTerm}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((m: any) => ({ 
        id: m.id,
        name: m.title,
        image_url: m.thumbnail_url || m.images?.[0] || null,
        price: m.price || 0,
        is_promotable: m.is_promotable || false,
        commission_tier: m.commission_tier || 'standard',
        referral_commission_diamonds: m.referral_commission_diamonds || 0,
        type: 'marketplace' as const
      }));
    },
  });

  // Update promotable status mutation
  const updatePromotable = useMutation({
    mutationFn: async ({ id, type, is_promotable, commission_tier }: { 
      id: string; 
      type: string; 
      is_promotable: boolean; 
      commission_tier?: string;
    }) => {
      const table = type === 'food' ? 'food_items' 
        : type === 'auction' ? 'auctions' 
        : type === 'marketplace' ? 'marketplace_listings'
        : 'products';
      
      const updateData: any = { 
        is_promotable,
        promotable_at: is_promotable ? new Date().toISOString() : null
      };
      
      if (commission_tier) {
        updateData.commission_tier = commission_tier;
      }
      
      const { error } = await (supabase as any)
        .from(table)
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-promotable-" + (variables.type === 'food' ? 'food' : variables.type + 's')] });
      toast.success("Item updated successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const renderItemRow = (item: PromotableItem) => (
    <TableRow key={`${item.type}-${item.id}`}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {item.type === 'food' && <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />}
                {item.type === 'auction' && <Gavel className="w-4 h-4 text-muted-foreground" />}
                {item.type === 'marketplace' && <Store className="w-4 h-4 text-muted-foreground" />}
                {item.type === 'product' && <Package className="w-4 h-4 text-muted-foreground" />}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate max-w-[200px]">{item.name}</p>
            <p className="text-xs text-muted-foreground">₱{item.price?.toLocaleString() || '0'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Switch
          checked={item.is_promotable || false}
          onCheckedChange={(checked) => updatePromotable.mutate({ 
            id: item.id, 
            type: item.type, 
            is_promotable: checked 
          })}
        />
      </TableCell>
      <TableCell>
        <Select
          value={item.commission_tier || 'standard'}
          onValueChange={(value) => updatePromotable.mutate({ 
            id: item.id, 
            type: item.type, 
            is_promotable: item.is_promotable,
            commission_tier: value 
          })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        {item.is_promotable ? (
          <Badge className="bg-emerald-500 text-white">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
    </TableRow>
  );

  const getItemCount = (items: PromotableItem[]) => {
    const active = items.filter(i => i.is_promotable).length;
    return `${active}/${items.length}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Promotable Items Management
        </CardTitle>
        <CardDescription>
          Manage which items appear in affiliate "Suggested Products to Promote" tab
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="products" className="text-xs gap-1">
              <Package className="w-3 h-3" />
              Products ({getItemCount(products)})
            </TabsTrigger>
            <TabsTrigger value="food" className="text-xs gap-1">
              <UtensilsCrossed className="w-3 h-3" />
              Food ({getItemCount(foodItems)})
            </TabsTrigger>
            <TabsTrigger value="auctions" className="text-xs gap-1">
              <Gavel className="w-3 h-3" />
              Auctions ({getItemCount(auctions)})
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="text-xs gap-1">
              <Store className="w-3 h-3" />
              Marketplace ({getItemCount(marketplaceItems)})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ScrollArea className="h-[500px]">
              {loadingProducts ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Promotable</TableHead>
                      <TableHead>Commission Tier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(renderItemRow)}
                    {products.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No products found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="food">
            <ScrollArea className="h-[500px]">
              {loadingFood ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Food Item</TableHead>
                      <TableHead>Promotable</TableHead>
                      <TableHead>Commission Tier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foodItems.map(renderItemRow)}
                    {foodItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No food items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="auctions">
            <ScrollArea className="h-[500px]">
              {loadingAuctions ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Auction</TableHead>
                      <TableHead>Promotable</TableHead>
                      <TableHead>Commission Tier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auctions.map(renderItemRow)}
                    {auctions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No auctions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="marketplace">
            <ScrollArea className="h-[500px]">
              {loadingMarketplace ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listing</TableHead>
                      <TableHead>Promotable</TableHead>
                      <TableHead>Commission Tier</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketplaceItems.map(renderItemRow)}
                    {marketplaceItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No marketplace listings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
