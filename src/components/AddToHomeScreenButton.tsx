import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Smartphone, Apple, Chrome, Share, Check } from 'lucide-react';
import { getPlatform, isPWA, isNativeApp } from '@/lib/mobileConfig';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface AddToHomeScreenButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export const AddToHomeScreenButton = ({ 
  variant = 'outline', 
  size = 'sm',
  className = '',
  showLabel = true 
}: AddToHomeScreenButtonProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    setIsInstalled(isPWA() || isNativeApp());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setOpen(false);
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // If we can trigger native install prompt directly
  if (deferredPrompt) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleInstallClick}
        className={className}
      >
        <Download className="h-4 w-4" />
        {showLabel && <span className="ml-1.5">Install App</span>}
      </Button>
    );
  }

  // Show instructions dialog for iOS or when no prompt available
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Smartphone className="h-4 w-4" />
          {showLabel && <span className="ml-1.5">Add to Home</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Add to Home Screen
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {platform === 'ios' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Apple className="w-6 h-6 text-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">iPhone/iPad</p>
                  <p className="text-xs text-muted-foreground">Use Safari browser</p>
                </div>
              </div>
              
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap the <Share className="inline h-4 w-4 mx-1" /> <strong>Share</strong> button</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap <strong>"Add"</strong> to confirm</span>
                </li>
              </ol>
            </div>
          )}

          {platform === 'android' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Chrome className="w-6 h-6 text-foreground flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Android</p>
                  <p className="text-xs text-muted-foreground">Use Chrome browser</p>
                </div>
              </div>
              
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap the <strong>⋮ menu</strong> (three dots)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap <strong>"Install"</strong> to confirm</span>
                </li>
              </ol>
            </div>
          )}

          {platform === 'web' && (
            <div className="text-center text-muted-foreground text-sm">
              <p>Visit on your mobile device for the best experience, or look for the install icon in your browser's address bar.</p>
            </div>
          )}

          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Check className="h-3 w-3 text-green-500" />
              Works offline • Faster loading • Full-screen
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToHomeScreenButton;
