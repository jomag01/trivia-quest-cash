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
}

export default function LeadershipStatus() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LeadershipStats>({
    totalEarnings: 0,
    activeLeaders: 0,
    currentRank: 0,
    isQualified: false,
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
      
      // Count unique 21% level downlines across 7 levels
      const uniqueLeaders = new Set(commissionsData?.map(c => c.downline_id) || []).size;

      setStats({
        totalEarnings,
        activeLeaders: uniqueLeaders,
        currentRank,
        isQualified,
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
            {stats.isQualified ? (
              <Badge className="bg-gradient-to-r from-yellow-500 to-yellow-600">
                21% Leader Qualified
              </Badge>
            ) : (
              <Badge variant="secondary">Not Yet Qualified</Badge>
            )}
          </div>
          <CardDescription>
            {stats.isQualified
              ? "You're earning 2% leadership breakaway from all 21% leaders in your 7-level network"
              : "Reach 21% level to unlock leadership breakaway earnings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                2% from 21% leaders
              </p>
            </div>

            {/* Active Leaders */}
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Active 21% Leaders
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {stats.activeLeaders}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                In your 7-level network
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
                {stats.currentRank}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Stair-step level
              </p>
            </div>
          </div>

          {!stats.isQualified && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>💡 How to qualify:</strong> Reach the 21% stair-step level by meeting sales quotas 
                for 3 consecutive months. Once qualified, you'll automatically earn 2% from all your 
                downlines who are also at 21% level, across 7 network levels.
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
            <CardDescription>Your latest royalty earnings from 21% leaders</CardDescription>
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
