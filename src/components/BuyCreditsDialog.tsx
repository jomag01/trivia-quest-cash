import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Gem, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BuyCreditsDialog = ({ open, onOpenChange }: BuyCreditsDialogProps) => {
  const navigate = useNavigate();

  const handleShopClick = () => {
    onOpenChange(false);
    navigate("/shop");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="w-6 h-6 text-primary" />
            Earn Gems & Diamonds
          </DialogTitle>
          <DialogDescription>
            Purchase merchandise to earn diamonds for playing games!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* How it works */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              How It Works
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Browse our merchandise store</p>
              <p>• Purchase products you love</p>
              <p>• Earn diamonds with each purchase</p>
              <p>• Use diamonds to play games & earn more!</p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-4 rounded-lg border border-primary/20">
            <p className="text-sm mb-4">
              Every product purchase comes with diamond rewards that you can use to play games and advance through levels!
            </p>
            <Button onClick={handleShopClick} className="w-full" size="lg">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Merchandise
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};