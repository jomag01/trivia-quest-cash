import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Users, TrendingUp, Copy, Share2, Wallet, 
  Calendar, ChevronRight, ExternalLink
} from "lucide-react";
import { motion } from "framer-motion";

interface ReferralStats {
  total_referrals: number;
  active_referrals: number;
  total_earnings: number;
  this_month_earnings: number;
}

export function BeesMateReferralDashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    total_referrals: 0,
    active_referrals: 0,
    total_earnings: 0,
    this_month_earnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentReferrals, setRecentReferrals] = useState<any[]>([]);

  const referralCode = profile?.referral_code || user?.id?.slice(0, 8);
  const referralLink = `${window.location.origin}/bees-mate?ref=${referralCode}`;

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchRecentReferrals();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('beesmate_referral_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setStats({
          total_referrals: data.total_referrals || 0,
          active_referrals: data.active_referrals || 0,
          total_earnings: Number(data.total_earnings) || 0,
          this_month_earnings: Number(data.this_month_earnings) || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentReferrals = async () => {
    if (!user) return;
    
    try {
      // Fetch from profiles where referred_by matches
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at')
        .eq('referred_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentReferrals(data || []);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BeesMate',
          text: 'Connect with like-minded people on BeesMate!',
          url: referralLink
        });
      } catch (error) {
        copyLink();
      }
    } else {
      copyLink();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Referral Link Card */}
      <Card className="bg-gradient-to-br from-rose-50 to-purple-50 dark:from-rose-950/30 dark:to-purple-950/30 border-rose-200 dark:border-rose-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input 
              value={referralLink} 
              readOnly 
              className="bg-white dark:bg-background text-sm"
            />
            <Button size="icon" variant="outline" onClick={copyLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            className="w-full bg-gradient-to-r from-rose-500 to-purple-600"
            onClick={shareLink}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share & Earn
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Earn commissions when your referrals upgrade to premium!
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total_referrals}</p>
                  <p className="text-xs text-muted-foreground">Total Referrals</p>
                </div>
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-950">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.active_referrals}</p>
                  <p className="text-xs text-muted-foreground">Active Members</p>
                </div>
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-950">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">₱{stats.this_month_earnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">This Month</p>
                </div>
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">₱{stats.total_earnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                </div>
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-950">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Referrals */}
      {recentReferrals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Referrals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentReferrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                    {(referral.full_name || 'U')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{referral.full_name || 'New User'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Commission Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="font-semibold text-sm mb-2">How You Earn</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Earn from direct referral premium upgrades (Unilevel Level 1)</p>
            <p>• Earn from team upgrades up to 7 levels deep</p>
            <p>• Qualify for Stairstep bonuses on volume</p>
            <p>• Achieve Leadership rank for breakaway commissions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}