import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import ProviderChat from "@/components/chat/ProviderChat";

interface SellerChatProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
}

interface SellerProduct {
  id: string;
  name: string;
  image_url?: string;
  price: number;
}

export default function SellerChat({ productId, productName, sellerId, sellerName }: SellerChatProps) {
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>([]);

  // Fetch seller's products for sharing
  useEffect(() => {
    if (!sellerId) return;

    const fetchSellerProducts = async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name, image_url, base_price, promo_price, promo_active')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .limit(20);

      if (data) {
        setSellerProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url || undefined,
          price: p.promo_active && p.promo_price ? p.promo_price : p.base_price
        })));
      }
    };

    fetchSellerProducts();
  }, [sellerId]);

  return (
    <ProviderChat
      providerId={sellerId}
      providerName={sellerName}
      providerType="shop"
      referenceId={productId}
      referenceTitle={productName}
      buttonVariant="outline"
      buttonSize="sm"
      availableProducts={sellerProducts}
    />
  );
}
