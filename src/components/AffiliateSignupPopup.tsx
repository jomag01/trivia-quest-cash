import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Gift, TrendingUp, Users, DollarSign, Sparkles } from "lucide-react";

export const AffiliateSignupPopup = () => {
  const { user, profile } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const isPaidAffiliate = (profile as any)?.is_paid_affiliate;

  useEffect(() => {
    // Don't show if user is already an affiliate or has dismissed before
    if (isPaidAffiliate || !user) return;

    const dismissed = localStorage.getItem('affiliate_popup_dismissed');
    const lastShown = localStorage.getItem('affiliate_popup_last_shown');
    const now = Date.now();

    // Show popup only once per 24 hours if not permanently dismissed
    if (dismissed === 'permanent') return;
    if (lastShown && now - parseInt(lastShown) < 24 * 60 * 60 * 1000) return;

    // Show popup after 30 seconds of browsing
    const timer = setTimeout(() => {
      setShowPopup(true);
      localStorage.setItem('affiliate_popup_last_shown', now.toString());
    }, 30000);

    return () => clearTimeout(timer);
  }, [user, isPaidAffiliate]);

  // Track page interactions to show popup after engagement
  useEffect(() => {
    if (isPaidAffiliate || !user) return;

    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage > 50 && !hasInteracted) {
        setHasInteracted(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, isPaidAffiliate, hasInteracted]);

  useEffect(() => {
    if (hasInteracted && !showPopup && user && !isPaidAffiliate) {
      const dismissed = localStorage.getItem('affiliate_popup_dismissed');
      if (dismissed !== 'permanent') {
        setShowPopup(true);
      }
    }
  }, [hasInteracted, showPopup, user, isPaidAffiliate]);

  const handleDismiss = (permanent: boolean) => {
    setShowPopup(false);
    if (permanent) {
      localStorage.setItem('affiliate_popup_dismissed', 'permanent');
    }
  };

  const handleJoinAffiliate = () => {
    setShowPopup(false);
    // Navigate to affiliate tab
    window.location.href = '/?tab=affiliate';
  };

  if (!user || isPaidAffiliate) return null;

  return (
    <Dialog open={showPopup} onOpenChange={setShowPopup}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            Want to Earn Extra Income?
          </DialogTitle>
          <DialogDescription className="text-base">
            Join our Affiliate Program and start earning commissions on every referral!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">High Commissions</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Grow Your Team</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Passive Income</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">AI Credits Bonus</span>
            </div>
          </div>

          <p className="text-center text-muted-foreground text-sm">
            Purchase an AI credit package to become an affiliate and unlock earning potential!
          </p>
        </div>

        {/* Income Disclaimer */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">SEC Disclaimer:</span> This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleJoinAffiliate}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
          >
            Join as Affiliate Now!
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleDismiss(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => handleDismiss(true)}
              className="flex-1 text-muted-foreground"
            >
              Don't Show Again
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
