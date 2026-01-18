import { useEffect, useState } from 'react';
import { useRetargeting } from '@/hooks/useRetargeting';
import { useAdAuction } from '@/hooks/useAdAuction';
import { useBehaviorTracking } from '@/hooks/useBehaviorTracking';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, ShoppingCart, Clock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  original_price?: number;
}

export const RetargetedProductsSection = () => {
  const navigate = useNavigate();
  const { getRetargetedProducts, buildRetargetingProfile } = useRetargeting();
  const { recordImpression, recordClick } = useAdAuction();
  const { trackAdImpression, trackAdClick } = useBehaviorTracking();
  const [products, setProducts] = useState<Product[]>([]);
  const [segment, setSegment] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRetargetedProducts = async () => {
      setLoading(true);
      
      // Get retargeting profile
      const segments = await buildRetargetingProfile();
      if (segments.length > 0) {
        setSegment(segments[0].segment);
      }

      // Get product IDs to retarget
      const productIds = await getRetargetedProducts(6);
      
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch product details
      const { data: productData } = await supabase
        .from('products')
        .select('id, name, final_price, base_price, promo_price, image_url')
        .in('id', productIds);

      if (productData) {
        const orderedProducts = productIds
          .map(id => {
            const p = productData.find(prod => prod.id === id);
            if (!p) return null;
            const price = p.promo_price || p.final_price || p.base_price || 0;
            const originalPrice = p.promo_price ? (p.final_price || p.base_price) : undefined;
            return { id: p.id, name: p.name, price, image_url: p.image_url || '', original_price: originalPrice };
          })
          .filter(Boolean) as Product[];
        setProducts(orderedProducts);

        // Track impressions
        orderedProducts.forEach((product, index) => {
          trackAdImpression(product.id, 'retargeting', index);
        });
      }

      setLoading(false);
    };

    fetchRetargetedProducts();
  }, []);

  const handleProductClick = (product: Product) => {
    trackAdClick(product.id, 'retargeting');
    navigate(`/product/${product.id}`);
  };

  const getSegmentLabel = () => {
    switch (segment) {
      case 'cart_abandoner':
        return { text: 'Still in your cart', icon: ShoppingCart, color: 'text-orange-500' };
      case 'frequent_viewer':
        return { text: 'You viewed these often', icon: Eye, color: 'text-blue-500' };
      case 'recent_viewer':
        return { text: 'Recently viewed', icon: Clock, color: 'text-green-500' };
      default:
        return { text: 'Recommended for you', icon: Sparkles, color: 'text-purple-500' };
    }
  };

  if (loading || products.length === 0) return null;

  const segmentInfo = getSegmentLabel();
  const SegmentIcon = segmentInfo.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <SegmentIcon className={`w-5 h-5 ${segmentInfo.color}`} />
          {segmentInfo.text}
          <Badge variant="outline" className="text-[10px] ml-auto">
            Personalized
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {products.map((product) => {
            const discount = product.original_price && product.price < product.original_price
              ? Math.round((1 - product.price / product.original_price) * 100)
              : 0;

            return (
              <div
                key={product.id}
                className="group cursor-pointer"
                onClick={() => handleProductClick(product)}
              >
                <div className="relative aspect-square mb-2 overflow-hidden rounded-lg">
                  <img
                    src={product.image_url || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {discount > 0 && (
                    <Badge className="absolute top-1 left-1 bg-red-500 text-white text-[10px]">
                      -{discount}%
                    </Badge>
                  )}
                  {segment === 'cart_abandoner' && (
                    <div className="absolute bottom-1 right-1 bg-orange-500 text-white text-[10px] px-1 py-0.5 rounded flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />
                      In cart
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium truncate">{product.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary">
                    ₱{product.price.toFixed(0)}
                  </span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      ₱{product.original_price.toFixed(0)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
