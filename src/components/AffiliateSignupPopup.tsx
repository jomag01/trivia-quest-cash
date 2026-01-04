import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Gift, TrendingUp, Users, DollarSign, Sparkles, Crown, Calendar, Star, Zap } from "lucide-react";
import AISubscriptionDialog from "@/components/ai/AISubscriptionDialog";

export const AffiliateSignupPopup = () => {
  const { user, profile } = useAuth();
  const [showPopup, setShowPopup] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    monthlyPrice: 1390,
    yearlyPrice: 11990,
    monthlyCredits: 500,
    yearlyCredits: 6000
  });

  const isPaidAffiliate = (profile as any)?.is_paid_affiliate;

  useEffect(() => {
    // Fetch subscription settings
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'ai_subscription_%');

      if (data) {
        data.forEach(s => {
          if (s.key === 'ai_subscription_monthly_price') {
            setSubscriptionSettings(prev => ({ ...prev, monthlyPrice: parseInt(s.value || '1390') }));
          } else if (s.key === 'ai_subscription_yearly_price') {
            setSubscriptionSettings(prev => ({ ...prev, yearlyPrice: parseInt(s.value || '11990') }));
          } else if (s.key === 'ai_subscription_monthly_credits') {
            setSubscriptionSettings(prev => ({ ...prev, monthlyCredits: parseInt(s.value || '500') }));
          } else if (s.key === 'ai_subscription_yearly_credits') {
            setSubscriptionSettings(prev => ({ ...prev, yearlyCredits: parseInt(s.value || '6000') }));
          }
        });
      }
    };

    fetchSettings();
  }, []);

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

  const handleSubscribe = () => {
    setShowPopup(false);
    setShowSubscriptionDialog(true);
  };

  if (!user || isPaidAffiliate) return null;

  const yearlySavings = Math.round(((subscriptionSettings.monthlyPrice * 12) - subscriptionSettings.yearlyPrice) / (subscriptionSettings.monthlyPrice * 12) * 100);

  return (
    <>
      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Crown className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              Unlock All AI Features
            </DialogTitle>
            <DialogDescription className="text-base">
              Subscribe to get unlimited access to all AI tools and earn affiliate commissions!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Subscription Plans Preview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Monthly</span>
                </div>
                <p className="text-xl font-bold">₱{subscriptionSettings.monthlyPrice.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{subscriptionSettings.monthlyCredits.toLocaleString()} credits</p>
              </div>
              <div className="p-3 rounded-lg border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 relative">
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-[10px]">
                  Save {yearlySavings}%
                </Badge>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Yearly</span>
                </div>
                <p className="text-xl font-bold">₱{subscriptionSettings.yearlyPrice.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{subscriptionSettings.yearlyCredits.toLocaleString()} credits</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium">All AI Tools</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium">Binary Network</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium">Earn Commissions</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium">Passive Income</span>
              </div>
            </div>
          </div>

          {/* Income Disclaimer */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">SEC Disclaimer:</span> This is a sales-based referral rewards program. Earnings are not guaranteed and depend on individual effort, team performance, and compliance with company rules.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSubscribe}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold gap-2"
            >
              <Zap className="h-4 w-4" />
              Subscribe & Join Affiliate Program
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

      {/* Subscription Dialog */}
      <AISubscriptionDialog
        open={showSubscriptionDialog}
        onOpenChange={setShowSubscriptionDialog}
      />
    </>
  );
};
