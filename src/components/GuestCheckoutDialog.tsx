import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn, UserPlus } from "lucide-react";

interface GuestCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuestCheckoutDialog = ({ open, onOpenChange }: GuestCheckoutDialogProps) => {
  const navigate = useNavigate();

  const handleSignIn = () => {
    onOpenChange(false);
    navigate("/auth?mode=signin&redirect=/dashboard?tab=cart");
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate("/auth?mode=signup&redirect=/dashboard?tab=cart");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign In Required</DialogTitle>
          <DialogDescription>
            To complete your checkout, please sign in or create an account. This helps us process your order and keep you updated.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <Button onClick={handleSignIn} className="w-full" size="lg">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In to Continue
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                New to the platform?
              </span>
            </div>
          </div>

          <Button onClick={handleSignUp} variant="outline" className="w-full" size="lg">
            <UserPlus className="mr-2 h-4 w-4" />
            Create an Account
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Continue Browsing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
