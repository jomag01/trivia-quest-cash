import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, X, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COOKIE_CONSENT_KEY = 'triviabees_cookie_consent';

export const CookieConsentPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      // Show popup after a short delay
      const timer = setTimeout(() => setShowPopup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      analytics: true,
      marketing: true,
    }));
    setIsClosing(true);
    setTimeout(() => setShowPopup(false), 300);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      analytics: false,
      marketing: false,
    }));
    setIsClosing(true);
    setTimeout(() => setShowPopup(false), 300);
  };

  const handleCustomize = () => {
    // For simplicity, accept essential cookies only
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      analytics: false,
      marketing: false,
      essential: true,
    }));
    setIsClosing(true);
    setTimeout(() => setShowPopup(false), 300);
  };

  if (!showPopup) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: isClosing ? 100 : 0, opacity: isClosing ? 0 : 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
      >
        <Card className="max-w-4xl mx-auto bg-card/95 backdrop-blur-sm border-2 shadow-2xl">
          <div className="p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex p-3 rounded-full bg-primary/10 shrink-0">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Cookie className="h-5 w-5 sm:hidden text-primary" />
                    We Value Your Privacy
                  </h3>
                  <button 
                    onClick={handleDecline}
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies and similar technologies to enhance your browsing experience, 
                  personalize content and ads, analyze site traffic, and understand where our 
                  visitors come from. By clicking "Accept All", you consent to our use of cookies.
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Your data is protected under our Privacy Policy</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="sm:order-1"
              >
                Decline
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomize}
                className="sm:order-2"
              >
                Essential Only
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                className="sm:order-3 sm:ml-auto bg-primary hover:bg-primary/90"
              >
                Accept All Cookies
              </Button>
            </div>

            <div className="mt-3 flex justify-center">
              <a 
                href="/privacy-policy" 
                className="text-xs text-primary hover:underline"
              >
                Learn more about our Cookie Policy
              </a>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
