import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, DollarSign, Crown, User, ChevronRight, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface ManagerProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  current_step: number;
  line_number: number;
  compressed_level: number; // The actual compressed level (1-7)
}

interface LeadershipStats {
  totalEarnings: number;
  activeLeaders: number;
  currentRank: number;
  isQualified: boolean;
  hasMinTwoLines: boolean;
  linesWithManagers: number;
  totalLines: number;
  managerLines: ManagerProfile[][];
}

/**
 * Dynamic Compression Leadership System:
 * 
 * When a Manager at any depth makes sales, those sales flow UP to all 7 levels above them.
 * Each upline who is also a Manager AND has the 2-line requirement met, earns 2% from those sales.
 * 
 * Example: If G is the 7th level and becomes a Manager:
 * - G's sales count toward earnings for F, E, D, C, B, A, and the root user
 * - Each of those uplines (if qualified) earns 2% from G's sales
 * 
 * The compression works by skipping non-managers and counting only managers up to 7 levels.
 */
async function findManagersInCompressedNetwork(
  userId: string,
  maxStep: number
): Promise<{ managers: ManagerProfile[]; lineManagers: Map<string, ManagerProfile[]> }> {
  const managers: ManagerProfile[] = [];
  const lineManagers = new Map<string, ManagerProfile[]>();
  const visited = new Set<string>();
  
  // Get ALL direct referrals (unlimited lines)
  const { data: directReferrals } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("referred_by", userId)
    .order("created_at", { ascending: true });

  if (!directReferrals) return { managers, lineManagers };

  // For each direct referral line, search down for managers using dynamic compression
  // The key: we count MANAGER levels, not actual tree depth
  for (let lineIndex = 0; lineIndex < directReferrals.length; lineIndex++) {
    const directRef = directReferrals[lineIndex];
    const lineId = directRef.id;
    const lineManagersList: ManagerProfile[] = [];
    let compressedLevel = 0; // Count only managers, not all levels
    
    // BFS through the entire line, but only count managers toward the 7-level limit
    const queue: { id: string; actualDepth: number }[] = [{ id: lineId, actualDepth: 1 }];
    
    while (queue.length > 0 && compressedLevel < 7) {
      const { id: currentId, actualDepth } = queue.shift()!;
      
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      
      // Check if this person is a manager
      const { data: rankData } = await supabase
        .from("affiliate_current_rank")
        .select("current_step")
        .eq("user_id", currentId)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", currentId)
        .maybeSingle();

      const isManager = rankData?.current_step === maxStep;
      
      if (isManager && profile) {
        compressedLevel++; // Only increment compressed level for managers
        const managerProfile: ManagerProfile = {
          ...profile,
          current_step: rankData!.current_step,
          line_number: lineIndex + 1,
          compressed_level: compressedLevel,
        };
        managers.push(managerProfile);
        lineManagersList.push(managerProfile);
      }
      
      // Continue searching down the tree regardless of manager status (dynamic compression)
      // This allows us to find managers at any depth
      const { data: subReferrals } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", currentId);
      
      if (subReferrals) {
        for (const sub of subReferrals) {
          queue.push({ id: sub.id, actualDepth: actualDepth + 1 });
        }
      }
    }
    
    if (lineManagersList.length > 0) {
      lineManagers.set(lineId, lineManagersList);
    }
  }
  
  return { managers, lineManagers };
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
    totalLines: 0,
    managerLines: [],
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
        .maybeSingle();

      // Get maximum step (Manager level - formerly 21%)
      const { data: maxStepData } = await supabase
        .from("stair_step_config")
        .select("step_number, commission_percentage")
        .eq("active", true)
        .order("step_number", { ascending: false })
        .limit(1)
        .maybeSingle();

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
      
      // Find qualifying managers using dynamic compression
      const { managers, lineManagers } = await findManagersInCompressedNetwork(
        user?.id || '',
        maxStep
      );

      const linesWithManagers = lineManagers.size;
      const hasMinTwoLines = linesWithManagers >= 2;
      const canEarnLeadershipBonus = isQualified && hasMinTwoLines;

      // Convert lineManagers map to array for display
      const managerLinesArray: ManagerProfile[][] = [];
      lineManagers.forEach((managers) => {
        managerLinesArray.push(managers);
      });

      // Get total number of direct referrals (lines)
      const { data: directReferrals } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", user?.id);
      
      const totalLines = directReferrals?.length || 0;

      setStats({
        totalEarnings: canEarnLeadershipBonus ? totalEarnings : 0,
        activeLeaders: managers.length,
        currentRank,
        isQualified,
        hasMinTwoLines,
        linesWithManagers,
        totalLines,
        managerLines: managerLinesArray,
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
              ? "You're earning 2% leadership bonus from all Manager Level leaders' sales in your 7-level compressed network"
              : stats.isQualified
              ? "You've reached Manager Level! Build 2 lines with managers to unlock 2% leadership bonus"
              : "Reach Manager Level to unlock leadership breakaway earnings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Total Leadership Earnings */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Leadership Income
                </span>
              </div>
              <div className="text-3xl font-bold text-green-500">
                ₱{stats.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                2% from Manager sales (flows up 7 levels)
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
                In your compressed 7-level network
              </p>
            </div>

            {/* Total Lines */}
            <div className={`bg-gradient-to-br rounded-lg p-4 from-yellow-500/10 to-amber-500/5`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-muted-foreground">
                  Total Lines
                </span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.totalLines}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Direct referral lines (unlimited)
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
                {stats.linesWithManagers} / {Math.max(2, stats.totalLines)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.hasMinTwoLines ? '✓ Requirement met' : 'Need 2+ lines with managers'}
              </p>
            </div>

            {/* Current Rank */}
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-muted-foreground">
                  Your Current Rank
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-500">
                {stats.isQualified ? 'Manager' : `Step ${stats.currentRank}`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.isQualified ? 'Top stair-step level' : 'Stair-step level'}
              </p>
            </div>
          </div>

          {/* Qualification Requirements */}
          {!stats.isQualified && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>💡 How to qualify for Manager Level:</strong> Reach the top stair-step level 
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

      {/* How Dynamic Compression Works */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-2">How Leadership Commissions Flow Up</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  When any Manager in your network makes sales, those sales <strong>flow up to all 7 levels above them</strong>.
                </p>
                <div className="bg-background/50 rounded-lg p-3 mt-2">
                  <p className="font-medium text-foreground mb-1">Example:</p>
                  <p>If Manager "G" is at your 7th compressed level and makes ₱10,000 in sales:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>You earn 2% = ₱200 from G's sales</li>
                    <li>All 6 other uplines above G (who are also qualified Managers with 2 lines) also earn 2% each</li>
                    <li>The system skips non-managers when counting levels</li>
                  </ul>
                </div>
                <p className="text-xs mt-2 italic">
                  Requirement: You must be a Manager AND have at least 2 lines with Managers to earn the 2% bonus.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manager Lines Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle>Your Manager Lines</CardTitle>
          </div>
          <CardDescription>
            Managers in your network who qualify you for the 2% leadership bonus (up to 7 compressed levels per line)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.managerLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No Manager Level affiliates in your network yet.</p>
              <p className="text-sm mt-1">Build your team to unlock leadership earnings!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Show ALL lines with managers (unlimited) */}
              {stats.managerLines.map((managers, lineIndex) => {
                const colors = [
                  { bg: 'blue-500/5', border: 'blue-500/20', gradient: 'blue' },
                  { bg: 'purple-500/5', border: 'purple-500/20', gradient: 'purple' },
                  { bg: 'green-500/5', border: 'green-500/20', gradient: 'green' },
                  { bg: 'orange-500/5', border: 'orange-500/20', gradient: 'orange' },
                  { bg: 'pink-500/5', border: 'pink-500/20', gradient: 'pink' },
                  { bg: 'teal-500/5', border: 'teal-500/20', gradient: 'teal' },
                  { bg: 'indigo-500/5', border: 'indigo-500/20', gradient: 'indigo' },
                  { bg: 'rose-500/5', border: 'rose-500/20', gradient: 'rose' },
                ];
                const color = colors[lineIndex % colors.length];
                
                return (
                  <div key={lineIndex} className={`p-4 rounded-lg border bg-${color.bg} border-${color.border}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={lineIndex < 2 ? "default" : "secondary"}>
                        Line {lineIndex + 1}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {managers.length} Manager(s) • Up to Level {Math.min(managers.length, 7)}
                      </span>
                      {lineIndex < 2 && (
                        <Badge variant="outline" className="text-green-600 border-green-500/30 text-xs">
                          Counts for 2% Bonus
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {managers.slice(0, 7).map((manager) => (
                        <div key={manager.id} className="flex items-center gap-2 bg-background rounded-lg p-2 pr-4">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={manager.avatar_url || undefined} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {manager.full_name || manager.email?.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Crown className="h-3 w-3 text-yellow-500" />
                              Level {manager.compressed_level}
                            </p>
                          </div>
                        </div>
                      ))}
                      {managers.length > 7 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ChevronRight className="h-4 w-4" />
                          +{managers.length - 7} beyond 7 levels
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Show placeholder if less than 2 lines with managers */}
              {stats.linesWithManagers < 2 && stats.totalLines > stats.linesWithManagers && (
                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Need {2 - stats.linesWithManagers} more line(s) with managers</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You have {stats.totalLines - stats.linesWithManagers} line(s) without managers yet. 
                    Help them reach Manager Level to unlock your leadership bonus.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Leadership Commissions */}
      {stats.isQualified && stats.hasMinTwoLines && commissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leadership Commissions</CardTitle>
            <CardDescription>
              2% earnings from Manager Level affiliates' sales (flows up 7 levels)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From Manager</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Sales Amount</TableHead>
                  <TableHead className="text-right">Commission (2%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.slice(0, 10).map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {new Date(commission.created_at).toLocaleDateString('en-PH')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Manager</Badge>
                    </TableCell>
                    <TableCell>Level {commission.level}</TableCell>
                    <TableCell>
                      ₱{Number(commission.sales_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-500">
                      +₱{Number(commission.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No Commissions Yet */}
      {stats.isQualified && stats.hasMinTwoLines && commissions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No leadership commissions yet.</p>
              <p className="text-sm mt-1">When Managers in your network make sales, you'll earn 2% from each level!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
