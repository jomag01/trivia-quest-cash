import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SocialShareMenu from "@/components/common/SocialShareMenu";

interface ProductShareButtonProps {
  productId: string;
  productName: string;
  productImage?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export const ProductShareButton = ({
  productId,
  productName,
  productImage,
  variant = "outline",
  size = "sm",
  className = "",
}: ProductShareButtonProps) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <button
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          toast.error("Please login to share products");
        }}
      >
        Share
      </button>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <SocialShareMenu
        title={`Check out ${productName}!`}
        description={`I found this amazing product: ${productName}. Check it out on Triviabees! 🐝`}
        path="/shop"
        params={{ product: productId }}
        variant={variant}
        size={size}
        className={className}
      />
    </div>
  );
};
