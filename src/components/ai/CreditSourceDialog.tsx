import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Coins, Sparkles, CreditCard } from 'lucide-react';

interface CreditSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (source: 'ai_credits' | 'legacy_credits') => void;
  aiCreditsAvailable: number;
  legacyCreditsAvailable: number;
  creditCost: number;
  serviceType: 'image' | 'video' | 'audio' | 'general';
  serviceName: string;
}

export const CreditSourceDialog = ({
  open,
  onOpenChange,
  onConfirm,
  aiCreditsAvailable,
  legacyCreditsAvailable,
  creditCost,
  serviceType,
  serviceName
}: CreditSourceDialogProps) => {
  const [selectedSource, setSelectedSource] = useState<'ai_credits' | 'legacy_credits'>('ai_credits');

  const canUseAICredits = serviceType === 'image' 
    ? aiCreditsAvailable >= creditCost
    : serviceType === 'video'
    ? aiCreditsAvailable >= 0.5 // video minutes
    : serviceType === 'audio'
    ? aiCreditsAvailable >= 0.5 // audio minutes
    : aiCreditsAvailable >= creditCost;

  const canUseLegacyCredits = legacyCreditsAvailable >= creditCost;

  const getAICreditsLabel = () => {
    switch (serviceType) {
      case 'image':
        return `${aiCreditsAvailable} images available`;
      case 'video':
        return `${aiCreditsAvailable.toFixed(1)} minutes available`;
      case 'audio':
        return `${aiCreditsAvailable.toFixed(1)} minutes available`;
      default:
        return `${aiCreditsAvailable} credits available`;
    }
  };

  const getCostLabel = () => {
    switch (serviceType) {
      case 'image':
        return `${creditCost} image credit`;
      case 'video':
        return `${creditCost} credits or 0.5 video minutes`;
      case 'audio':
        return `${creditCost} credits or 0.5 audio minutes`;
      default:
        return `${creditCost} credits`;
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedSource);
    onOpenChange(false);
  };

  // Auto-select available source
  const effectiveSource = canUseAICredits ? 'ai_credits' : canUseLegacyCredits ? 'legacy_credits' : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Choose Credit Source
          </DialogTitle>
          <DialogDescription>
            Select how you want to pay for {serviceName}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Cost: <span className="font-semibold text-foreground">{getCostLabel()}</span>
          </p>

          <RadioGroup
            value={selectedSource}
            onValueChange={(value) => setSelectedSource(value as 'ai_credits' | 'legacy_credits')}
            className="space-y-3"
          >
            {/* AI Credits Option */}
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              selectedSource === 'ai_credits' ? 'border-primary bg-primary/5' : 'border-border'
            } ${!canUseAICredits ? 'opacity-50' : ''}`}>
              <RadioGroupItem 
                value="ai_credits" 
                id="ai_credits" 
                disabled={!canUseAICredits}
              />
              <Label 
                htmlFor="ai_credits" 
                className={`flex-1 cursor-pointer ${!canUseAICredits ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">AI Credits</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {canUseAICredits ? getAICreditsLabel() : 'Insufficient AI credits'}
                </p>
              </Label>
            </div>

            {/* Legacy Credits Option */}
            <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
              selectedSource === 'legacy_credits' ? 'border-primary bg-primary/5' : 'border-border'
            } ${!canUseLegacyCredits ? 'opacity-50' : ''}`}>
              <RadioGroupItem 
                value="legacy_credits" 
                id="legacy_credits"
                disabled={!canUseLegacyCredits}
              />
              <Label 
                htmlFor="legacy_credits" 
                className={`flex-1 cursor-pointer ${!canUseLegacyCredits ? 'cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Account Credits</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {canUseLegacyCredits 
                    ? `₱${legacyCreditsAvailable.toLocaleString()} available`
                    : 'Insufficient credits'
                  }
                </p>
              </Label>
            </div>
          </RadioGroup>

          {!canUseAICredits && !canUseLegacyCredits && (
            <p className="text-sm text-destructive mt-3">
              You don't have enough credits. Please purchase more to continue.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!canUseAICredits && !canUseLegacyCredits}
          >
            Confirm & Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreditSourceDialog;
