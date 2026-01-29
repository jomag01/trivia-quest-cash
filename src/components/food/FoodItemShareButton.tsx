import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SocialShareMenu from "@/components/common/SocialShareMenu";

interface FoodItemShareButtonProps {
  foodItemId: string;
  foodItemName: string;
  foodItemImage?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
}

export const FoodItemShareButton = ({
  foodItemId,
  foodItemName,
  foodItemImage,
  variant = "outline",
  size = "sm",
  className = "",
}: FoodItemShareButtonProps) => {
  const { user, profile } = useAuth();

  if (!user) {
    return (
      <button
        className={`inline-flex items-center justify-center rounded-md text-sm font-medium ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          toast.error("Please login to share food items");
        }}
      >
        Share
      </button>
    );
  }

  // Build params with food item ID for direct linking
  const shareParams: Record<string, string> = {
    food: foodItemId,
    src: "share",
  };

  // Add referral code from profile
  if (profile?.referral_code) {
    shareParams.ref = profile.referral_code;
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <SocialShareMenu
        title={`Order ${foodItemName}!`}
        description={`Check out ${foodItemName} on Triviabees Food Delivery! 🍔🐝`}
        path="/food"
        params={shareParams}
        variant={variant}
        size={size}
        className={className}
        entityType="food"
        entityId={foodItemId}
        imageUrl={foodItemImage}
      />
    </div>
  );
};
