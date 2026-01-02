import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Crown, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UnlockFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  featureDescription: string;
  unlockCost: number;
  userCredits: number;
  onUnlock: () => void;
  onBuyCredits: () => void;
}

const UnlockFeatureDialog: React.FC<UnlockFeatureDialogProps> = ({
  open,
  onOpenChange,
  featureName,
  featureDescription,
  unlockCost,
  userCredits,
  onUnlock,
  onBuyCredits,
}) => {
  const { user } = useAuth();
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const hasEnoughCredits = userCredits >= unlockCost;
  
  const handleUnlock = async () => {
    if (!user) {
      toast.error('Please login to unlock this feature');
      return;
    }
    
    if (!hasEnoughCredits) {
      toast.error('Not enough credits to unlock this feature');
      return;
    }
    
    setIsUnlocking(true);
    try {
      // Deduct credits from user
      const { error } = await supabase
        .from('profiles')
        .update({ credits: userCredits - unlockCost })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(`🔓 ${featureName} unlocked! Enjoy the premium features!`);
      onUnlock();
      onOpenChange(false);
    } catch (error) {
      console.error('Error unlocking feature:', error);
      toast.error('Failed to unlock feature. Please try again.');
    } finally {
      setIsUnlocking(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-amber-500/30 bg-gradient-to-br from-amber-50/95 via-orange-50/90 to-yellow-50/95 dark:from-amber-950/95 dark:via-orange-950/90 dark:to-yellow-950/95">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse">
              <Lock className="h-10 w-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <span className="text-2xl">🐝</span>
            </div>
          </div>
          <DialogTitle className="text-xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Unlock {featureName}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {featureDescription}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Cost Display */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Unlock Cost</span>
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                {unlockCost} Credits
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Balance</span>
              <Badge variant="outline" className={hasEnoughCredits ? "text-green-600 border-green-500/30" : "text-red-600 border-red-500/30"}>
                {userCredits} Credits
              </Badge>
            </div>
            {hasEnoughCredits && (
              <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                <span className="text-sm font-medium">After Unlock</span>
                <Badge variant="outline">
                  {userCredits - unlockCost} Credits
                </Badge>
              </div>
            )}
          </div>
          
          {!hasEnoughCredits && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                You need {unlockCost - userCredits} more credits to unlock this feature.
              </p>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          {hasEnoughCredits ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-amber-500/30"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUnlock}
                disabled={isUnlocking}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    Unlock Now
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-amber-500/30"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onBuyCredits();
                }}
                className="gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
              >
                <Sparkles className="h-4 w-4" />
                Buy Credits
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnlockFeatureDialog;
