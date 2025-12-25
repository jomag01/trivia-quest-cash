import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, DollarSign, Crown, User, ChevronRight } from "lucide-react";
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
}

interface LeadershipStats {
  totalEarnings: number;
  activeLeaders: number;
  currentRank: number;
  isQualified: boolean;
  hasMinTwoLines: boolean;
  linesWithManagers: number;
  managerLines: ManagerProfile[][];
}

// Dynamic compression: Find qualifying managers up to 7 levels deep
async function findQualifyingManagersWithCompression(
  userId: string,
  maxStep: number,
  maxLevels: number = 7
): Promise<{ managers: ManagerProfile[]; lineManagers: Map<string, ManagerProfile[]> }> {
  const managers: ManagerProfile[] = [];
  const lineManagers = new Map<string, ManagerProfile[]>();
  const visited = new Set<string>();
  
  // Get direct referrals first (these define the "lines")
  const { data: directReferrals } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("referred_by", userId);

  if (!directReferrals) return { managers, lineManagers };

  // For each direct referral line, search down for managers using dynamic compression
  for (const directRef of directReferrals) {
    const lineId = directRef.id;
    const lineManagersList: ManagerProfile[] = [];
    let managersFoundInLine = 0;
    
    // BFS through the line, skipping non-managers (dynamic compression)
    const queue: { id: string; depth: number }[] = [{ id: lineId, depth: 1 }];
    
    while (queue.length > 0 && managersFoundInLine < maxLevels) {
      const { id: currentId, depth } = queue.shift()!;
      
      if (visited.has(currentId) || depth > maxLevels * 3) continue; // Allow deeper search with compression
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

      if (rankData?.current_step === maxStep && profile) {
        const managerProfile: ManagerProfile = {
          ...profile,
          current_step: rankData.current_step,
          line_number: directReferrals.indexOf(directRef) + 1,
        };
        managers.push(managerProfile);
        lineManagersList.push(managerProfile);
        managersFoundInLine++;
      }
      
      // Get this person's referrals to continue search (dynamic compression continues through non-managers)
      const { data: subReferrals } = await supabase
        .from("profiles")
        .select("id")
        .eq("referred_by", currentId);
      
      if (subReferrals) {
        for (const sub of subReferrals) {
          queue.push({ id: sub.id, depth: depth + 1 });
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
      
      // Find qualifying managers using dynamic compression (searches through non-managers)
      const { managers, lineManagers } = await findQualifyingManagersWithCompression(
        user?.id || '',
        maxStep,
        7
      );

      const linesWithManagers = lineManagers.size;
      const hasMinTwoLines = linesWithManagers >= 2;
      const canEarnLeadershipBonus = isQualified && hasMinTwoLines;

      // Convert lineManagers map to array for display
      const managerLinesArray: ManagerProfile[][] = [];
      lineManagers.forEach((managers) => {
        managerLinesArray.push(managers);
      });

      setStats({
        totalEarnings: canEarnLeadershipBonus ? totalEarnings : 0,
        activeLeaders: managers.length,
        currentRank,
        isQualified,
        hasMinTwoLines,
        linesWithManagers,
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
              ? "You're earning 2% leadership breakaway from all Manager Level leaders in your 7-level compressed network"
              : stats.isQualified
              ? "You've reached Manager Level! Build 2 lines with managers to unlock 2% leadership bonus"
              : "Reach Manager Level to unlock leadership breakaway earnings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Leadership Earnings - Made more prominent */}
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
                2% from Manager Level leaders (Dynamic Compression)
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

      {/* Manager Lines Display - New Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle>Your Manager Lines</CardTitle>
          </div>
          <CardDescription>
            Managers in your network who qualify you for the 2% leadership bonus (Dynamic Compression Applied)
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
              {stats.managerLines.slice(0, 2).map((managers, lineIndex) => (
                <div key={lineIndex} className={`p-4 rounded-lg border ${
                  lineIndex === 0 ? 'bg-blue-500/5 border-blue-500/20' : 'bg-purple-500/5 border-purple-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={lineIndex === 0 ? "default" : "secondary"}>
                      Line {lineIndex + 1}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {managers.length} Manager(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {managers.slice(0, 5).map((manager) => (
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
                            Manager Level
                          </p>
                        </div>
                      </div>
                    ))}
                    {managers.length > 5 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                        +{managers.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {stats.managerLines.length < 2 && (
                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Line {stats.managerLines.length + 1}</Badge>
                    <span className="text-sm text-muted-foreground">Needed</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Build another referral line with at least one Manager Level affiliate to unlock leadership bonus.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dynamic Compression Info */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">Dynamic Compression Active</h4>
              <p className="text-sm text-muted-foreground">
                Your leadership bonus searches through your entire network to find qualifying Manager Level affiliates, 
                skipping non-qualifying members. This ensures you earn 2% from up to 7 levels of managers, 
                regardless of how deep they are in your actual referral tree.
              </p>
            </div>
          </div>
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