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
  utmSource?: string;
  utmCampaign?: string;
}

export const ProductShareButton = ({
  productId,
  productName,
  productImage,
  variant = "outline",
  size = "sm",
  className = "",
  utmSource,
  utmCampaign,
}: ProductShareButtonProps) => {
  const { user, profile } = useAuth();

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

  // Build proper params with product ID for direct linking
  const shareParams: Record<string, string> = { 
    product: productId,
    src: 'share'
  };
  
  // Add referral code from profile
  if (profile?.referral_code) {
    shareParams.ref = profile.referral_code;
  }
  
  // Add UTM params if provided
  if (utmSource) shareParams.utm_source = utmSource;
  if (utmCampaign) shareParams.utm_campaign = utmCampaign;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <SocialShareMenu
        title={`Check out ${productName}!`}
        description={`I found this amazing product: ${productName}. Check it out on Triviabees! 🐝`}
        path="/shop"
        params={shareParams}
        variant={variant}
        size={size}
        className={className}
      />
    </div>
  );
};
