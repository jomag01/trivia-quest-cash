import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Gem, Trophy, Users, TrendingUp, Medal, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  email: string;
  total_diamonds: number;
  total_earned: number;
  total_spent: number;
  referral_count: number;
  rank: number;
}

export const DiamondLeaderboard = () => {
  const [topEarners, setTopEarners] = useState<LeaderboardEntry[]>([]);
  const [topReferrers, setTopReferrers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      // Fetch top diamond earners
      const { data: earners, error: earnersError } = await (supabase as any)
        .from("treasure_wallet")
        .select(`
          user_id,
          diamonds,
          profiles!inner (
            full_name,
            email
          )
        `)
        .order("diamonds", { ascending: false })
        .limit(20);

      if (earnersError) throw earnersError;

      // Get transaction stats for each user
      const earnersWithStats = await Promise.all(
        (earners || []).map(async (earner: any, index: number) => {
          // Get total earned and spent
          const { data: transactions } = await (supabase as any)
            .from("diamond_transactions")
            .select("amount, type")
            .eq("user_id", earner.user_id);

          const totalEarned = (transactions || [])
            .filter((t: any) => t.type === "credit")
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          const totalSpent = (transactions || [])
            .filter((t: any) => t.type === "debit")
            .reduce((sum: number, t: any) => sum + t.amount, 0);

          // Get referral count
          const { count: referralCount } = await (supabase as any)
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("referrer_id", earner.user_id);

          return {
            user_id: earner.user_id,
            full_name: earner.profiles.full_name || "Anonymous",
            email: earner.profiles.email,
            total_diamonds: earner.diamonds,
            total_earned: totalEarned,
            total_spent: totalSpent,
            referral_count: referralCount || 0,
            rank: index + 1,
          };
        })
      );

      setTopEarners(earnersWithStats);

      // Sort by referral count for top referrers
      const sortedByReferrals = [...earnersWithStats].sort(
        (a, b) => b.referral_count - a.referral_count
      );
      setTopReferrers(sortedByReferrals);
    } catch (error: any) {
      console.error("Error fetching leaderboards:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-700" />;
      default:
        return (
          <div className="h-6 w-6 flex items-center justify-center font-bold text-muted-foreground">
            {rank}
          </div>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderLeaderboardTable = (entries: LeaderboardEntry[], sortBy: "diamonds" | "referrals") => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Rank</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Gem className="h-4 w-4" />
              Balance
            </div>
          </TableHead>
          <TableHead className="text-right">
            <div className="flex items-center justify-end gap-1">
              <TrendingUp className="h-4 w-4" />
              Earned
            </div>
          </TableHead>
          <TableHead className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Users className="h-4 w-4" />
              Referrals
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.user_id} className={entry.rank <= 3 ? "bg-primary/5" : ""}>
            <TableCell>
              <div className="flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getInitials(entry.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{entry.full_name}</div>
                  <div className="text-xs text-muted-foreground">{entry.email}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <span className="font-bold text-primary">
                  {entry.total_diamonds.toLocaleString()}
                </span>
                <Gem className="h-4 w-4 text-primary" />
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="text-green-500 font-semibold">
                +{entry.total_earned.toLocaleString()}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="secondary" className="font-semibold">
                {entry.referral_count}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-gradient-gold">Diamond Leaderboard</h2>
          <p className="text-muted-foreground">Top performers and their achievements</p>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {topEarners.slice(0, 3).map((entry, index) => {
          const heights = ["h-48", "h-56", "h-44"];
          const orders = [1, 0, 2]; // 2nd, 1st, 3rd
          const actualIndex = orders.indexOf(index);
          
          return (
            <Card
              key={entry.user_id}
              className={`p-6 flex flex-col items-center justify-end ${heights[actualIndex]} ${
                index === 1 ? "border-yellow-500/50 bg-gradient-to-b from-yellow-500/10 to-transparent" :
                index === 0 ? "border-gray-400/50 bg-gradient-to-b from-gray-400/10 to-transparent" :
                "border-amber-700/50 bg-gradient-to-b from-amber-700/10 to-transparent"
              }`}
              style={{ order: orders[index] }}
            >
              <div className="mb-3">{getRankIcon(entry.rank)}</div>
              <Avatar className="h-16 w-16 mb-3">
                <AvatarFallback className="text-lg font-bold bg-primary/20">
                  {getInitials(entry.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center mb-2">
                <div className="font-bold">{entry.full_name}</div>
                <div className="text-xs text-muted-foreground">{entry.email}</div>
              </div>
              <div className="flex items-center gap-1 text-primary font-bold text-xl">
                {entry.total_diamonds.toLocaleString()}
                <Gem className="h-5 w-5" />
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {entry.referral_count} referrals
              </div>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="earners" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earners" className="gap-2">
            <Gem className="h-4 w-4" />
            Top Earners
          </TabsTrigger>
          <TabsTrigger value="referrers" className="gap-2">
            <Users className="h-4 w-4" />
            Top Referrers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="earners">
          <Card>
            {topEarners.length === 0 ? (
              <div className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No data available yet</p>
              </div>
            ) : (
              renderLeaderboardTable(topEarners, "diamonds")
            )}
          </Card>
        </TabsContent>

        <TabsContent value="referrers">
          <Card>
            {topReferrers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No referral data available yet</p>
              </div>
            ) : (
              renderLeaderboardTable(topReferrers, "referrals")
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
