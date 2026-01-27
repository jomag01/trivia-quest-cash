import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, Share2, Sparkles, TrendingUp, Package, Gem, UtensilsCrossed, Gavel, Store } from "lucide-react";
import SocialShareMenu from "@/components/common/SocialShareMenu";
import { generateProductShareUrl, generateSocialShareUrl } from "@/lib/shareUtils";

interface PromotableItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  referral_commission_diamonds: number;
  commission_tier: string;
  is_pod?: boolean;
  type: 'product' | 'food' | 'auction' | 'marketplace';
}

export default function SuggestedProductsToPromote() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch promotable products
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["promotable-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, image_url, referral_commission_diamonds, commission_tier, is_pod, category_id")
        .eq("is_active", true)
        .eq("is_promotable", true)
        .order("referral_commission_diamonds", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map(p => ({ 
        ...p, 
        price: p.base_price,
        type: 'product' as const 
      }));
    },
  });

  // Fetch promotable food items
  const { data: foodItems = [], isLoading: loadingFood } = useQuery({
    queryKey: ["promotable-food-items"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("food_items")
        .select("id, name, price, image_url, referral_commission_diamonds, commission_tier, vendor:food_vendors(name)")
        .eq("is_available", true)
        .eq("is_promotable", true)
        .order("referral_commission_diamonds", { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []).map((f: any) => ({ 
        ...f, 
        referral_commission_diamonds: f.referral_commission_diamonds || 0,
        commission_tier: f.commission_tier || 'standard',
        type: 'food' as const,
        vendorName: f.vendor?.name
      }));
    },
  });

  // Fetch promotable auctions
  const { data: auctions = [], isLoading: loadingAuctions } = useQuery({
    queryKey: ["promotable-auctions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select("id, title, images, starting_bid, current_bid, commission_tier")
        .eq("status", "active")
        .eq("is_promotable", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []).map((a: any) => ({ 
        id: a.id,
        name: a.title,
        price: a.current_bid || a.starting_bid,
        image_url: a.images?.[0] || null,
        referral_commission_diamonds: 0,
        commission_tier: a.commission_tier || 'standard',
        type: 'auction' as const
      }));
    },
  });

  // Fetch promotable marketplace listings
  const { data: marketplaceItems = [], isLoading: loadingMarketplace } = useQuery({
    queryKey: ["promotable-marketplace"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketplace_listings")
        .select("id, title, thumbnail_url, images, price, referral_commission_diamonds, commission_tier")
        .eq("status", "active")
        .eq("is_promotable", true)
        .order("referral_commission_diamonds", { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []).map((m: any) => ({ 
        id: m.id,
        name: m.title,
        price: m.price || 0,
        image_url: m.thumbnail_url || m.images?.[0] || null,
        referral_commission_diamonds: m.referral_commission_diamonds || 0,
        commission_tier: m.commission_tier || 'standard',
        type: 'marketplace' as const
      }));
    },
  });

  // Combine all items
  const allItems = [...products, ...foodItems, ...auctions, ...marketplaceItems];
  const highCommissionItems = allItems.filter(i => i.referral_commission_diamonds > 50 || i.commission_tier === 'premium' || i.commission_tier === 'high');
  const isLoading = loadingProducts || loadingFood || loadingAuctions || loadingMarketplace;

  const getShareUrl = (item: PromotableItem) => {
    const refCode = profile?.referral_code || '';
    if (item.type === 'product') {
      return generateProductShareUrl(item.id, refCode);
    }
    return generateSocialShareUrl(item.type === 'food' ? 'restaurant' : item.type, item.id, refCode);
  };

  const copyShareLink = (item: PromotableItem) => {
    const shareUrl = getShareUrl(item);
    navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied!");
  };

  const getCommissionBadge = (diamonds: number, tier: string) => {
    if (tier === "premium" || diamonds > 100) {
      return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">💎 Premium</Badge>;
    } else if (tier === "high" || diamonds > 50) {
      return <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white">🔥 High</Badge>;
    }
    return <Badge variant="secondary">Standard</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'food': return <UtensilsCrossed className="w-3 h-3" />;
      case 'auction': return <Gavel className="w-3 h-3" />;
      case 'marketplace': return <Store className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      product: 'bg-blue-500',
      food: 'bg-orange-500',
      auction: 'bg-purple-500',
      marketplace: 'bg-teal-500'
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[type]} text-white border-none`}>
        {getTypeIcon(type)}
        <span className="ml-1 capitalize">{type}</span>
      </Badge>
    );
  };

  const getEntityType = (type: string): 'product' | 'auction' | 'restaurant' | 'marketplace' | 'service' => {
    if (type === 'food') return 'restaurant';
    return type as any;
  };

  const getSharePath = (type: string) => {
    switch (type) {
      case 'food': return '/food';
      case 'auction': return '/auction';
      case 'marketplace': return '/marketplace';
      default: return '/shop';
    }
  };

  const ItemCard = ({ item }: { item: PromotableItem }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex gap-3 p-3">
        <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {getTypeIcon(item.type)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
            {getTypeBadge(item.type)}
          </div>
          <p className="text-sm font-bold text-primary mt-1">
            {item.type === 'auction' ? `₱${item.price?.toLocaleString()} bid` : `₱${item.price?.toFixed(2)}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {getCommissionBadge(item.referral_commission_diamonds, item.commission_tier || 'standard')}
            {item.referral_commission_diamonds > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Gem className="w-3 h-3 text-amber-500" />
                +{item.referral_commission_diamonds} 💎
              </span>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyShareLink(item)}>
              <Copy className="w-3 h-3 mr-1" />
              Copy Link
            </Button>
            <SocialShareMenu
              title={`Check out ${item.name}!`}
              description={`Amazing ${item.type} on Triviabees!`}
              path={getSharePath(item.type)}
              params={{ [item.type]: item.id, ref: profile?.referral_code || '', src: 'share' }}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              entityType={getEntityType(item.type)}
              entityId={item.id}
              imageUrl={item.image_url || undefined}
            />
          </div>
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Suggested Items to Promote
        </CardTitle>
        <CardDescription>
          Share products, food, auctions & listings to earn higher commissions!
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="all" className="text-xs">
              <Share2 className="w-3 h-3 mr-1" />
              All ({allItems.length})
            </TabsTrigger>
            <TabsTrigger value="high-commission" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              High ({highCommissionItems.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="food" className="text-xs">
              <UtensilsCrossed className="w-3 h-3 mr-1" />
              Food ({foodItems.length})
            </TabsTrigger>
            <TabsTrigger value="auctions" className="text-xs">
              <Gavel className="w-3 h-3 mr-1" />
              Auctions ({auctions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {allItems.length > 0 ? (
                  allItems.map((item) => (
                    <ItemCard key={`${item.type}-${item.id}`} item={item} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Share2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No promotable items available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="high-commission">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {highCommissionItems.length > 0 ? (
                  highCommissionItems.map((item) => (
                    <ItemCard key={`${item.type}-${item.id}`} item={item} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No high-commission items available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="products">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {products.length > 0 ? (
                  products.map((item) => (
                    <ItemCard key={`product-${item.id}`} item={item} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No promotable products available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="food">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {foodItems.length > 0 ? (
                  foodItems.map((item) => (
                    <ItemCard key={`food-${item.id}`} item={item} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No promotable food items available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="auctions">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {auctions.length > 0 ? (
                  auctions.map((item) => (
                    <ItemCard key={`auction-${item.id}`} item={item} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gavel className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No promotable auctions available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
