import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface DriverTipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  driverId: string;
  driverName?: string;
}

const TIP_OPTIONS = [10, 20, 50];

export const DriverTipDialog = ({
  open,
  onOpenChange,
  orderId,
  driverId,
  driverName = "your driver",
}: DriverTipDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);

  const tipAmount = selectedTip || (customTip ? parseFloat(customTip) : 0);

  const tipMutation = useMutation({
    mutationFn: async () => {
      if (!user || tipAmount <= 0) throw new Error("Invalid tip");

      const { error } = await (supabase as any).from("driver_tips").insert({
        order_id: orderId,
        driver_id: driverId,
        customer_id: user.id,
        amount: tipAmount,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setShowThankYou(true);
      queryClient.invalidateQueries({ queryKey: ["my-food-orders"] });
      setTimeout(() => {
        setShowThankYou(false);
        onOpenChange(false);
        setSelectedTip(null);
        setCustomTip("");
      }, 2500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send tip");
    },
  });

  const handleSelectTip = (amount: number) => {
    setSelectedTip(amount);
    setCustomTip("");
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setSelectedTip(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {showThankYou ? (
            <motion.div
              key="thank-you"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <Sparkles className="w-16 h-16 text-yellow-500 mb-4" />
              </motion.div>
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-center"
              >
                Thank You!
              </motion.h3>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground text-center mt-2"
              >
                Your ₱{tipAmount} tip has been sent to {driverName}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="tip-form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Tip {driverName}
                </DialogTitle>
                <DialogDescription>
                  Show appreciation for great service. 100% goes to the driver!
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Preset tips */}
                <div className="grid grid-cols-3 gap-2">
                  {TIP_OPTIONS.map((amount) => (
                    <Button
                      key={amount}
                      variant={selectedTip === amount ? "default" : "outline"}
                      className="h-14 text-lg font-bold"
                      onClick={() => handleSelectTip(amount)}
                    >
                      ₱{amount}
                    </Button>
                  ))}
                </div>

                {/* Custom tip */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₱
                  </span>
                  <Input
                    type="number"
                    placeholder="Custom amount"
                    value={customTip}
                    onChange={(e) => handleCustomTipChange(e.target.value)}
                    className="pl-8"
                    min="1"
                    step="1"
                  />
                </div>

                {/* Send button */}
                <Button
                  className="w-full h-12"
                  disabled={tipAmount <= 0 || tipMutation.isPending}
                  onClick={() => tipMutation.mutate()}
                >
                  {tipMutation.isPending ? (
                    "Sending..."
                  ) : (
                    <>
                      Send ₱{tipAmount || 0} Tip
                      <Heart className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Tips are optional but highly appreciated
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
