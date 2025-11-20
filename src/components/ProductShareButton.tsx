import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProductShareButtonProps {
  productId: string;
  productName: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const ProductShareButton = ({
  productId,
  productName,
  variant = "outline",
  size = "sm",
  className = "",
}: ProductShareButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = user 
    ? `${window.location.origin}/shop?ref=${user.id}&product=${productId}`
    : `${window.location.origin}/shop?product=${productId}`;

  const handleCopy = async () => {
    if (!user) {
      toast.error("Please login to share products");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!user) {
      toast.error("Please login to share products");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out ${productName}!`,
          text: `I found this amazing product: ${productName}`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          handleShare();
        }}
        className={className}
      >
        <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
        Share
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Product</DialogTitle>
            <DialogDescription>
              Share this product with friends and earn diamond commissions when they purchase!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input value={shareUrl} readOnly className="flex-1" />
              <Button size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💎 When someone buys through your link, you'll earn diamond commissions!
              <br />
              🌟 If they sign up, they'll automatically join your network!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
