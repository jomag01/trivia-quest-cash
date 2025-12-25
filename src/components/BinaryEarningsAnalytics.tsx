import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  GitBranch, 
  Wallet, 
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BinaryEarning {
  id: string;
  amount: number;
  left_volume_used: number;
  right_volume_used: number;
  cycles_matched: number;
  created_at: string;
}

interface BinaryNetwork {
  left_volume: number;
  right_volume: number;
  total_cycles: number;
}

interface BinaryEarningsAnalyticsProps {
  onCashOut?: () => void;
}

export default function BinaryEarningsAnalytics({ onCashOut }: BinaryEarningsAnalyticsProps) {
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<BinaryEarning[]>([]);
  const [network, setNetwork] = useState<BinaryNetwork | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [dailyEarnings, setDailyEarnings] = useState<{ date: string; amount: number; cycles: number }[]>([]);
  const [settings, setSettings] = useState({
    cycleAmount: 2000,
    cycleCommission: 200,
    maxCyclesPerDay: 10
  });

  useEffect(() => {
    fetchBinaryData();
  }, []);

  const fetchBinaryData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch binary network position
      const { data: networkData, error: networkError } = await supabase
        .from("binary_network")
        .select("left_volume, right_volume, total_cycles")
        .eq("user_id", user.id)
        .maybeSingle();

      if (networkError) throw networkError;
      setNetwork(networkData);

      // Fetch binary commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("binary_commissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (commissionsError) throw commissionsError;
      setEarnings(commissionsData || []);

      // Calculate total earnings
      const total = (commissionsData || []).reduce((sum, c) => sum + Number(c.amount), 0);
      setTotalEarnings(total);

      // Fetch daily earnings
      const { data: dailyData, error: dailyError } = await supabase
        .from("binary_daily_earnings")
        .select("earning_date, total_earned, cycles_completed")
        .eq("user_id", user.id)
        .order("earning_date", { ascending: false })
        .limit(7);

      if (dailyError) throw dailyError;
      setDailyEarnings(
        (dailyData || []).map(d => ({
          date: d.earning_date,
          amount: Number(d.total_earned) || 0,
          cycles: d.cycles_completed || 0
        }))
      );

      // Calculate pending balance from commissions
      const pendingTotal = (commissionsData || []).reduce((sum, c) => sum + Number(c.amount), 0);
      setPendingBalance(pendingTotal);

      // Fetch binary settings
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["binary_cycle_amount", "binary_cycle_commission", "binary_max_cycles_per_day"]);

      if (settingsData) {
        const newSettings = { ...settings };
        settingsData.forEach(s => {
          if (s.key === "binary_cycle_amount" && s.value) newSettings.cycleAmount = Number(s.value);
          if (s.key === "binary_cycle_commission" && s.value) newSettings.cycleCommission = Number(s.value);
          if (s.key === "binary_max_cycles_per_day" && s.value) newSettings.maxCyclesPerDay = Number(s.value);
        });
        setSettings(newSettings);
      }
    } catch (error: any) {
      console.error("Error fetching binary data:", error);
      toast.error("Failed to load binary earnings data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-3 sm:p-4">
              <Skeleton className="h-5 sm:h-6 w-20 sm:w-24 mb-2" />
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const weakerLeg = Math.min(network?.left_volume || 0, network?.right_volume || 0);
  const potentialCycles = Math.floor(weakerLeg / settings.cycleAmount);
  const potentialEarnings = potentialCycles * settings.cycleCommission;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            <Badge variant="outline" className="text-green-500 border-green-500/50 text-[10px] sm:text-xs">
              Total
            </Badge>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-500">₱{totalEarnings.toFixed(2)}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total Binary Earnings</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            <Badge variant="outline" className="text-blue-500 border-blue-500/50 text-[10px] sm:text-xs">
              Available
            </Badge>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-500">₱{pendingBalance.toFixed(2)}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Available for Cash Out</p>
          {pendingBalance > 0 && onCashOut && (
            <Button size="sm" variant="outline" className="mt-2 w-full text-xs" onClick={onCashOut}>
              Cash Out
            </Button>
          )}
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <GitBranch className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
            <Badge variant="outline" className="text-purple-500 border-purple-500/50 text-[10px] sm:text-xs">
              Cycles
            </Badge>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-500">{network?.total_cycles || 0}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total Cycles Matched</p>
        </Card>

        <Card className="p-3 sm:p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-[10px] sm:text-xs">
              Potential
            </Badge>
          </div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-500">₱{potentialEarnings.toFixed(2)}</div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{potentialCycles} pending cycles</p>
        </Card>
      </div>

      {/* Volume Balance */}
      <Card className="p-4 sm:p-6">
        <h3 className="font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <GitBranch className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Binary Leg Volumes
        </h3>
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 sm:gap-2">
                <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                <span className="text-xs sm:text-sm">Left Leg</span>
              </span>
              <span className="font-bold text-blue-500 text-xs sm:text-sm">₱{(network?.left_volume || 0).toLocaleString()}</span>
            </div>
            <div className="h-2 sm:h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((network?.left_volume || 0) / Math.max(network?.left_volume || 1, network?.right_volume || 1)) * 100)}%` 
                }}
              />
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 sm:gap-2">
                <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                <span className="text-xs sm:text-sm">Right Leg</span>
              </span>
              <span className="font-bold text-green-500 text-xs sm:text-sm">₱{(network?.right_volume || 0).toLocaleString()}</span>
            </div>
            <div className="h-2 sm:h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((network?.right_volume || 0) / Math.max(network?.left_volume || 1, network?.right_volume || 1)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-accent/50 rounded-lg">
          <p className="text-[10px] sm:text-sm text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
            <span><strong>Weaker:</strong> ₱{weakerLeg.toLocaleString()}</span>
            <span><strong>Cycle:</strong> ₱{settings.cycleAmount.toLocaleString()}</span>
            <span><strong>Commission:</strong> ₱{settings.cycleCommission}</span>
          </p>
        </div>
      </Card>

      {/* Daily Earnings */}
      {dailyEarnings.length > 0 && (
        <Card className="p-4 sm:p-6">
          <h3 className="font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Daily Earnings (Last 7 Days)
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {dailyEarnings.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-accent/30 rounded-lg">
                <div>
                  <p className="font-medium text-xs sm:text-sm">{formatDate(day.date)}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{day.cycles} cycles</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-500 text-sm sm:text-base">+₱{day.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="p-4 sm:p-6">
        <h3 className="font-bold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Recent Binary Commissions
        </h3>
        {earnings.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <GitBranch className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No binary commissions yet</p>
            <p className="text-xs sm:text-sm">Start building your binary network!</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
            {earnings.map((earning) => (
              <div key={earning.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
                      {earning.cycles_matched || 1} cycle(s)
                    </Badge>
                    <span className="text-[10px] sm:text-sm text-muted-foreground truncate">
                      L: ₱{earning.left_volume_used?.toLocaleString()} | R: ₱{earning.right_volume_used?.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {formatDate(earning.created_at)} at {formatTime(earning.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-bold text-green-500 text-sm sm:text-base">+₱{Number(earning.amount).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
