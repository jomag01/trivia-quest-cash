import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Apple, Chrome } from 'lucide-react';
import { getPlatform, isPWA, isNativeApp } from '@/lib/mobileConfig';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

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
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Already Installed!</CardTitle>
            <CardDescription>
              Triviabees is installed on your device. Open it from your home screen.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Install Triviabees</CardTitle>
          <CardDescription>
            Get the full app experience with offline access and push notifications
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Android / Chrome - Direct install */}
          {deferredPrompt && (
            <Button 
              onClick={handleInstallClick} 
              className="w-full h-14 text-lg"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Install App
            </Button>
          )}

          {/* iOS Instructions */}
          {platform === 'ios' && !deferredPrompt && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Apple className="w-8 h-8 text-foreground" />
                <div>
                  <p className="font-medium">Install on iPhone/iPad</p>
                  <p className="text-sm text-muted-foreground">Follow these steps:</p>
                </div>
              </div>
              
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap the <strong>Share</strong> button (square with arrow) in Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap <strong>"Add"</strong> to confirm</span>
                </li>
              </ol>
            </div>
          )}

          {/* Android fallback instructions */}
          {platform === 'android' && !deferredPrompt && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Chrome className="w-8 h-8 text-foreground" />
                <div>
                  <p className="font-medium">Install on Android</p>
                  <p className="text-sm text-muted-foreground">Follow these steps:</p>
                </div>
              </div>
              
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Tap the <strong>menu</strong> (three dots) in Chrome</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Tap <strong>"Install"</strong> to confirm</span>
                </li>
              </ol>
            </div>
          )}

          {/* Desktop fallback */}
          {platform === 'web' && !deferredPrompt && (
            <div className="text-center text-muted-foreground">
              <p>Visit this page on your mobile device to install the app, or look for the install icon in your browser's address bar.</p>
            </div>
          )}

          {/* Benefits */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Why install?</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Works offline
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Faster loading
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Push notifications
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Full-screen experience
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
