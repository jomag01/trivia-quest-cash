import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Calendar, Award, Copy, Check, Facebook, Twitter, MessageCircle, Send, Music, Youtube, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
interface StairStepConfig {
  step_number: number;
  step_name: string;
  commission_percentage: number;
  sales_quota: number;
  months_to_qualify: number;
}
interface CurrentRank {
  current_step: number;
  qualification_count: number;
  is_fixed: boolean;
  last_qualified_at: string | null;
  admin_activated?: boolean;
}
interface MonthlySales {
  total_sales: number;
  personal_sales: number;
  team_sales: number;
}
export default function AffiliateRankCard() {
  const {
    user,
    profile
  } = useAuth();
  const [currentRank, setCurrentRank] = useState<CurrentRank | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlySales | null>(null);
  const [stairSteps, setStairSteps] = useState<StairStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);
  const fetchData = async () => {
    try {
      // Fetch current rank
      const {
        data: rankData
      } = await supabase.from("affiliate_current_rank").select("*").eq("user_id", user!.id).maybeSingle();
      setCurrentRank(rankData);

      // Fetch current month sales
      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";
      const {
        data: salesData
      } = await supabase.from("affiliate_monthly_sales").select("*").eq("user_id", user!.id).eq("sales_month", currentMonth).maybeSingle();
      setMonthlySales(salesData || {
        total_sales: 0,
        personal_sales: 0,
        team_sales: 0
      });

      // Fetch stair step config
      const {
        data: stepsData
      } = await supabase.from("stair_step_config").select("*").eq("active", true).order("step_number");
      setStairSteps(stepsData || []);
    } catch (error) {
      console.error("Error fetching affiliate rank data:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle>Affiliate Rank</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>;
  }
  const currentStep = stairSteps.find(s => s.step_number === (currentRank?.current_step || 0));
  const nextStep = stairSteps.find(s => s.step_number === (currentRank?.current_step || 0) + 1);
  const salesProgress = nextStep ? Math.min((monthlySales?.total_sales || 0) / nextStep.sales_quota * 100, 100) : 100;
  const referralLink = `${window.location.origin}/auth?ref=${profile?.referral_code || ''}`;
  const shortReferralCode = profile?.referral_code || '';
  const shareMessage = `Join me on this amazing platform! Use my code: ${shortReferralCode} or visit: ${referralLink}`;
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };
  const shareOnFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`;
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    if (!newWindow) {
      copyReferralLink();
      toast.info("Please allow popups for sharing. Link copied to clipboard!");
    }
  };
  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on this amazing platform!')}`;
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
    if (!newWindow) {
      copyReferralLink();
      toast.info("Please allow popups for sharing. Link copied to clipboard!");
    }
  };
  const shareOnWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      copyReferralLink();
      toast.info("Please allow popups for sharing. Link copied to clipboard!");
    }
  };
  const shareOnTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on this amazing platform!')}`;
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      copyReferralLink();
      toast.info("Please allow popups for sharing. Link copied to clipboard!");
    }
  };
  const shareOnTikTok = () => {
    // TikTok doesn't have direct web sharing, so we copy the link
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copied! Open TikTok to share it in your bio or posts");
  };
  const shareOnYouTube = () => {
    // YouTube doesn't have direct sharing for external links
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copied! Add it to your YouTube video description or community post");
  };
  return <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
              Affiliate Rank
            </CardTitle>
            <CardDescription>Your current position in the stair-step plan</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentRank?.admin_activated && <Badge variant="secondary" className="flex items-center gap-1 bg-blue-500/20 text-blue-600 border-blue-500/30">
                <Shield className="w-3 h-3" />
                Admin Activated
              </Badge>}
            {currentRank?.is_fixed && <Badge variant="default" className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                Fixed Position
              </Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Rank */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Rank</span>
            <span className="font-bold text-primary text-sm">
              {currentStep ? currentStep.step_name : "Unranked"}
            </span>
          </div>
          {currentStep && <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Commission Rate</span>
              <span className="font-semibold text-foreground">
                {currentStep.commission_percentage}%
              </span>
            </div>}
        </div>

        {/* Referral Link */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Referral Code</span>
          </div>
          
          {/* Prominent Referral Code Display */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Share this code:</p>
              <div className="text-2xl font-bold text-primary tracking-wider mb-2">
                {shortReferralCode}
              </div>
              <Button variant="outline" size="sm" onClick={() => {
              navigator.clipboard.writeText(shortReferralCode);
              toast.success("Referral code copied!");
            }} className="text-xs">
                <Copy className="w-3 h-3 mr-1" />
                Copy Code
              </Button>
            </div>
          </div>

          {/* Full Link Display */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Or share the full link:</p>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all">
                {referralLink}
              </div>
              <Button variant="outline" size="sm" onClick={copyReferralLink} className="shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          {/* Social Media Share Buttons */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Quick Share:</span>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={shareOnFacebook} className="flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                <span className="text-xs">Facebook</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnTwitter} className="flex items-center gap-2">
                <Twitter className="w-4 h-4" />
                <span className="text-xs">Twitter</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnWhatsApp} className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">WhatsApp</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnTelegram} className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                <span className="text-xs">Telegram</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnTikTok} className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                <span className="text-xs">TikTok</span>
              </Button>
              <Button variant="outline" size="sm" onClick={shareOnYouTube} className="flex items-center gap-2">
                <Youtube className="w-4 h-4" />
                <span className="text-xs">YouTube</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              💡 Tip: If popups are blocked, the link will be copied automatically
            </p>
          </div>
        </div>

        {/* Qualification Progress */}
        {currentRank && !currentRank.is_fixed && <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Qualification Progress
              </span>
              <span className="text-sm">
                {currentRank.qualification_count}/{currentStep?.months_to_qualify || 3} months
              </span>
            </div>
            <Progress value={currentRank.qualification_count / (currentStep?.months_to_qualify || 3) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {currentRank.is_fixed ? "Position is fixed - no reversion at month end" : `Qualify ${(currentStep?.months_to_qualify || 3) - currentRank.qualification_count} more month(s) to fix your position`}
            </p>
          </div>}

        {/* Monthly Sales Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4" />
              This Month's Sales
            </span>
            <span className="text-sm font-semibold">
              ₱{(monthlySales?.total_sales || 0).toLocaleString()}
            </span>
          </div>
          
          {nextStep && <>
              <Progress value={salesProgress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Next rank: {nextStep.step_name} ({nextStep.commission_percentage}%)</span>
                <span>₱{nextStep.sales_quota.toLocaleString()}</span>
              </div>
            </>}

          {/* Sales Breakdown */}
          <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Personal Sales</p>
              <p className="font-semibold">₱{(monthlySales?.personal_sales || 0).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Team Sales</p>
              <p className="font-semibold">₱{(monthlySales?.team_sales || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Rank Tiers */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Available Ranks</span>
          <div className="space-y-1">
            {stairSteps.map(step => <div key={step.step_number} className={`p-2 rounded text-xs flex items-center justify-between ${currentRank?.current_step === step.step_number ? "bg-primary/10 border border-primary" : "bg-muted"}`}>
                <span className="font-medium">{step.step_name}</span>
                <div className="flex items-center gap-4">
                  <span>{step.commission_percentage}%</span>
                  <span className="text-muted-foreground">
                    ₱{step.sales_quota.toLocaleString()} quota
                  </span>
                </div>
              </div>)}
          </div>
        </div>

        {!currentRank?.is_fixed && <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-700 dark:text-amber-400">
            <p className="font-semibold mb-1">⚠️ Reversion Notice</p>
            <p>
              Your rank is not yet fixed. If you don't meet the sales quota this month, 
              you'll revert to 0% at month end. Qualify for {currentStep?.months_to_qualify || 3} consecutive 
              months to fix your position.
            </p>
          </div>}
      </CardContent>
    </Card>;
}