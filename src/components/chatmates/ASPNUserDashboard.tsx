import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Coins, Award, Target, Activity, 
  Calendar, ChevronRight, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

interface ASPNEnrollment {
  tier_id: string;
  tier_name: string;
  total_sp_earned: number;
  total_earnings: number;
  lifetime_cap: number | null;
  is_graduated: boolean;
}

interface SPLedgerEntry {
  id: string;
  source_type: string;
  sp_amount: number;
  created_at: string;
}

interface ASPNEarning {
  id: string;
  amount: number;
  sp_used: number;
  created_at: string;
}

export function ASPNUserDashboard() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<ASPNEnrollment | null>(null);
  const [spLedger, setSPLedger] = useState<SPLedgerEntry[]>([]);
  const [earnings, setEarnings] = useState<ASPNEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayEarnings: 0,
    monthEarnings: 0,
    lifetimeEarnings: 0
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch enrollment with tier info
      const { data: enrollmentData } = await supabase
        .from('aspn_user_enrollment')
        .select(`
          *,
          aspn_tiers (tier_name, lifetime_cap)
        `)
        .eq('user_id', user.id)
        .single();

      if (enrollmentData) {
        setEnrollment({
          tier_id: enrollmentData.tier_id,
          tier_name: (enrollmentData.aspn_tiers as any)?.tier_name || 'Unknown',
          total_sp_earned: Number(enrollmentData.total_sp_earned) || 0,
          total_earnings: Number(enrollmentData.total_earnings) || 0,
          lifetime_cap: (enrollmentData.aspn_tiers as any)?.lifetime_cap,
          is_graduated: enrollmentData.is_graduated
        });
      }

      // Fetch SP ledger
      const { data: ledgerData } = await supabase
        .from('aspn_sp_ledger')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ledgerData) setSPLedger(ledgerData);

      // Fetch earnings
      const { data: earningsData } = await supabase
        .from('aspn_earnings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (earningsData) {
        setEarnings(earningsData);

        const today = new Date().toISOString().split('T')[0];
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        const todayEarnings = earningsData
          .filter(e => e.created_at.startsWith(today))
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const monthEarnings = earningsData
          .filter(e => e.created_at >= monthStart)
          .reduce((sum, e) => sum + Number(e.amount), 0);

        const lifetimeEarnings = earningsData.reduce((sum, e) => sum + Number(e.amount), 0);

        setStats({ todayEarnings, monthEarnings, lifetimeEarnings });
      }
    } catch (error) {
      console.error('Error fetching ASPN data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'subscription': return '📦';
      case 'ai_credits': return '🤖';
      case 'shop': return '🛒';
      case 'beesmate_premium': return '💜';
      default: return '💰';
    }
  };

  const getCapProgress = () => {
    if (!enrollment || !enrollment.lifetime_cap) return 0;
    return Math.min((enrollment.total_earnings / enrollment.lifetime_cap) * 100, 100);
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

  if (!enrollment) {
    return (
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white mx-auto flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="font-semibold">ASPN Rewards</h3>
          <p className="text-sm text-muted-foreground mt-1">
            You're not enrolled in ASPN yet. Earn SP from purchases to participate in pool rewards!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">ASPN Rewards</h3>
                <p className="text-xs text-muted-foreground">{enrollment.tier_name} Tier</p>
              </div>
            </div>
            {enrollment.is_graduated ? (
              <Badge className="bg-amber-500 text-white">
                <Sparkles className="w-3 h-3 mr-1" />
                Graduated
              </Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </div>

          {/* Lifetime Cap Progress */}
          {enrollment.lifetime_cap && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Lifetime Cap Progress</span>
                <span>₱{enrollment.total_earnings.toLocaleString()} / ₱{enrollment.lifetime_cap.toLocaleString()}</span>
              </div>
              <Progress value={getCapProgress()} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold text-green-600">₱{stats.todayEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold text-blue-600">₱{stats.monthEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-lg font-bold text-purple-600">{enrollment.total_sp_earned.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total SP</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Tabs */}
      <Tabs defaultValue="sp">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sp" className="text-xs">
            <Coins className="w-3 h-3 mr-1" />
            SP Activity
          </TabsTrigger>
          <TabsTrigger value="earnings" className="text-xs">
            <TrendingUp className="w-3 h-3 mr-1" />
            Earnings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sp">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {spLedger.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No SP activity yet</p>
              ) : (
                spLedger.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSourceIcon(entry.source_type)}</span>
                      <div>
                        <p className="text-sm font-medium capitalize">{entry.source_type.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-600">
                      +{Number(entry.sp_amount).toFixed(2)} SP
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings">
          <Card>
            <CardContent className="pt-4 space-y-2">
              {earnings.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No earnings yet</p>
              ) : (
                earnings.slice(0, 10).map((earning) => (
                  <div key={earning.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">Pool Distribution</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(earning.created_at).toLocaleDateString()} • {Number(earning.sp_used).toFixed(2)} SP used
                      </p>
                    </div>
                    <Badge className="bg-green-500 text-white">
                      +₱{Number(earning.amount).toLocaleString()}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* How ASPN Works */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            How ASPN Works
          </h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• Earn Sales Points (SP) from your purchases and your team's activity</p>
            <p>• SP flows up your genealogy with decay per level</p>
            <p>• Pool rewards are distributed based on your SP share</p>
            <p>• Independent from Unilevel, Stairstep, and Leadership earnings</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}