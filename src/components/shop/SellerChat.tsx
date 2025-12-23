import ProviderChat from "@/components/chat/ProviderChat";

interface SellerChatProps {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
}

export default function SellerChat({ productId, productName, sellerId, sellerName }: SellerChatProps) {
  return (
    <ProviderChat
      providerId={sellerId}
      providerName={sellerName}
      providerType="shop"
      referenceId={productId}
      referenceTitle={productName}
      buttonVariant="outline"
      buttonSize="sm"
    />
  );
}