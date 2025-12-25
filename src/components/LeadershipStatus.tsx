import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeadershipCommission {
  id: string;
  downline_id: string;
  level: number;
  amount: number;
  sales_amount: number;
  created_at: string;
  notes: string;
}

interface LeadershipStats {
  totalEarnings: number;
  activeLeaders: number;
  currentRank: number;
  isQualified: boolean;
  hasMinTwoLines: boolean;
  linesWithManagers: number;
}

export default function LeadershipStatus() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LeadershipStats>({
    totalEarnings: 0,
    activeLeaders: 0,
    currentRank: 0,
    isQualified: false,
    hasMinTwoLines: false,
    linesWithManagers: 0,
  });
  const [commissions, setCommissions] = useState<LeadershipCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeadershipData();
    }
  }, [user]);

  const fetchLeadershipData = async () => {
    try {
      setLoading(true);

      // Get user's current stair step rank
      const { data: rankData } = await supabase
        .from("affiliate_current_rank")
        .select("current_step")
        .eq("user_id", user?.id)
        .single();

      // Get maximum step (21% level)
      const { data: maxStepData } = await supabase
        .from("stair_step_config")
        .select("step_number, commission_percentage")
        .eq("active", true)
        .order("step_number", { ascending: false })
        .limit(1)
        .single();

      const currentRank = rankData?.current_step || 0;
      const maxStep = maxStepData?.step_number || 0;
      const isQualified = currentRank === maxStep;

      // Get leadership commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("leadership_commissions")
        .select("*")
        .eq("upline_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (commissionsError) throw commissionsError;

      const totalEarnings = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      
      // Count unique Manager level downlines across 7 levels
      const uniqueLeaders = new Set(commissionsData?.map(c => c.downline_id) || []).size;

      // Check for 2-line requirement: count distinct lines with at least one manager
      // Get direct referrals who are at manager level
      const { data: directReferrals } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", user?.id);

      let linesWithManagers = 0;
      
      if (directReferrals && directReferrals.length > 0) {
        // Check each direct referral line for managers
        for (const referral of directReferrals) {
          const { data: lineRank } = await supabase
            .from("affiliate_current_rank")
            .select("current_step")
            .eq("user_id", referral.id)
            .single();

          if (lineRank?.current_step === maxStep) {
            linesWithManagers++;
          } else {
            // Check if any downline in this line is at manager level
            const { data: lineCommissions } = await supabase
              .from("leadership_commissions")
              .select("downline_id")
              .eq("upline_id", user?.id)
              .limit(100);

            // Check if any downline under this referral is at manager level
            if (lineCommissions?.some(c => c.downline_id === referral.id)) {
              linesWithManagers++;
            }
          }
        }
      }

      const hasMinTwoLines = linesWithManagers >= 2;
      const canEarnLeadershipBonus = isQualified && hasMinTwoLines;

      setStats({
        totalEarnings: canEarnLeadershipBonus ? totalEarnings : 0,
        activeLeaders: uniqueLeaders,
        currentRank,
        isQualified,
        hasMinTwoLines,
        linesWithManagers,
      });

      setCommissions(commissionsData || []);
    } catch (error: any) {
      console.error("Error fetching leadership data:", error);
      toast.error("Failed to load leadership status");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading leadership status...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Leadership Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              <CardTitle>Leadership Status</CardTitle>
            </div>
            {stats.isQualified && stats.hasMinTwoLines ? (
              <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600">
                Manager Level Qualified
              </Badge>
            ) : stats.isQualified ? (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                Manager Level (Pending 2-Line Requirement)
              </Badge>
            ) : (
              <Badge variant="secondary">Not Yet Qualified</Badge>
            )}
          </div>
          <CardDescription>
            {stats.isQualified && stats.hasMinTwoLines
              ? "You're earning 2% leadership breakaway from all Manager Level leaders in your 7-level network"
              : stats.isQualified
              ? "You've reached Manager Level! Build 2 lines with managers to unlock 2% leadership bonus"
              : "Reach Manager Level to unlock leadership breakaway earnings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Leadership Earnings */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  Total Royalty Income
                </span>
              </div>
              <div className="text-2xl font-bold text-primary">
                ₱{stats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                2% from Manager Level leaders
              </p>
            </div>

            {/* Active Leaders */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Active Managers
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {stats.activeLeaders}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In your 7-level network
              </p>
            </div>

            {/* Lines with Managers */}
            <div className={`bg-gradient-to-br rounded-lg p-4 ${
              stats.hasMinTwoLines 
                ? 'from-green-500/10 to-green-500/5' 
                : 'from-orange-500/10 to-orange-500/5'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${stats.hasMinTwoLines ? 'text-green-500' : 'text-orange-500'}`} />
                <span className="text-sm font-medium text-muted-foreground">
                  Lines with Managers
                </span>
              </div>
              <div className={`text-2xl font-bold ${stats.hasMinTwoLines ? 'text-green-500' : 'text-orange-500'}`}>
                {stats.linesWithManagers} / 2
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.hasMinTwoLines ? '✓ Requirement met' : 'Need 2 lines with managers'}
              </p>
            </div>

            {/* Current Rank */}
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Your Current Rank
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-500">
                {stats.currentRank === 21 ? 'Manager' : `${stats.currentRank}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.currentRank === 21 ? 'Top stair-step level' : 'Stair-step level'}
              </p>
            </div>
          </div>

          {/* Qualification Requirements */}
          {!stats.isQualified && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>💡 How to qualify for Manager Level:</strong> Reach the top stair-step level (21%) 
                by meeting sales quotas for 3 consecutive months.
              </p>
            </div>
          )}

          {stats.isQualified && !stats.hasMinTwoLines && (
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm">
                <strong>⚠️ 2-Line Requirement:</strong> To earn the 2% leadership bonus, you need at least 
                <strong> 2 direct referral lines</strong>, each with at least one Manager Level affiliate. 
                Currently you have <strong>{stats.linesWithManagers}</strong> qualifying line(s).
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leadership Commissions */}
      {stats.isQualified && commissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leadership Commissions</CardTitle>
            <CardDescription>Your latest royalty earnings from Manager Level leaders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Sales Amount</TableHead>
                    <TableHead>Your Earning (2%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.slice(0, 10).map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell className="text-sm">
                        {new Date(commission.created_at).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Level {commission.level}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₱{Number(commission.sales_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        ₱{Number(commission.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {commissions.length > 10 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Showing 10 most recent commissions
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
