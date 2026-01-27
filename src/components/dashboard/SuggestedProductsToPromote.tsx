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
import { Copy, ExternalLink, Share2, Sparkles, TrendingUp, Package, Gem } from "lucide-react";
import SocialShareMenu from "@/components/common/SocialShareMenu";
import { generateProductShareUrl } from "@/lib/shareUtils";

interface PromotableProduct {
  id: string;
  name: string;
  base_price: number;
  image_url: string | null;
  referral_commission_diamonds: number;
  commission_tier: string;
  is_pod: boolean;
  category_id: string | null;
}

export default function SuggestedProductsToPromote() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("high-commission");

  // Fetch promotable products
  const { data: products = [], isLoading } = useQuery({
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
      return data as PromotableProduct[];
    },
  });

  // Fetch high-commission products (referral_commission_diamonds > 50)
  const { data: highCommissionProducts = [] } = useQuery({
    queryKey: ["high-commission-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, image_url, referral_commission_diamonds, commission_tier, is_pod, category_id")
        .eq("is_active", true)
        .gt("referral_commission_diamonds", 50)
        .order("referral_commission_diamonds", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as PromotableProduct[];
    },
  });

  // Fetch POD products for promotion
  const { data: podProducts = [] } = useQuery({
    queryKey: ["pod-products-promote"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, image_url, referral_commission_diamonds, commission_tier, is_pod, category_id")
        .eq("is_active", true)
        .eq("is_pod", true)
        .order("referral_commission_diamonds", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as PromotableProduct[];
    },
  });

  const copyShareLink = (product: PromotableProduct) => {
    const shareUrl = generateProductShareUrl(product.id, profile?.referral_code);
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

  const ProductCard = ({ product }: { product: PromotableProduct }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex gap-3 p-3">
        <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
            {product.is_pod && (
              <Badge variant="outline" className="text-xs shrink-0">POD</Badge>
            )}
          </div>
          <p className="text-sm font-bold text-primary mt-1">₱{product.base_price.toFixed(2)}</p>
          <div className="flex items-center gap-2 mt-1">
            {getCommissionBadge(product.referral_commission_diamonds, product.commission_tier || 'standard')}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Gem className="w-3 h-3 text-amber-500" />
              +{product.referral_commission_diamonds} 💎
            </span>
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => copyShareLink(product)}>
              <Copy className="w-3 h-3 mr-1" />
              Copy Link
            </Button>
            <SocialShareMenu
              title={`Check out ${product.name}!`}
              description={`Amazing product on Triviabees!`}
              path="/shop"
              params={{ product: product.id, ref: profile?.referral_code || '', src: 'share' }}
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
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
          Suggested Products to Promote
        </CardTitle>
        <CardDescription>
          Share these products to earn higher commissions! Copy links or share directly to social media.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="high-commission" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" />
              High Commission
            </TabsTrigger>
            <TabsTrigger value="pod" className="text-xs">
              <Package className="w-3 h-3 mr-1" />
              Print-on-Demand
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs">
              <Share2 className="w-3 h-3 mr-1" />
              All Promotable
            </TabsTrigger>
          </TabsList>

          <TabsContent value="high-commission">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {highCommissionProducts.length > 0 ? (
                  highCommissionProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No high-commission products available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="pod">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {podProducts.length > 0 ? (
                  podProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No Print-on-Demand products available yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all">
            <ScrollArea className="h-[500px]">
              <div className="grid gap-3 pr-4">
                {products.length > 0 ? (
                  products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Share2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No promotable products available yet</p>
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
