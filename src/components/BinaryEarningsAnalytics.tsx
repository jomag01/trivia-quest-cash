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
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <Badge variant="outline" className="text-green-500 border-green-500/50 text-xs">
              Total
            </Badge>
          </div>
          <div className="text-2xl font-bold text-green-500">₱{totalEarnings.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Total Binary Earnings</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            <Badge variant="outline" className="text-blue-500 border-blue-500/50 text-xs">
              Available
            </Badge>
          </div>
          <div className="text-2xl font-bold text-blue-500">₱{pendingBalance.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Available for Cash Out</p>
          {pendingBalance > 0 && onCashOut && (
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={onCashOut}>
              Cash Out
            </Button>
          )}
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <GitBranch className="w-5 h-5 text-purple-500" />
            <Badge variant="outline" className="text-purple-500 border-purple-500/50 text-xs">
              Cycles
            </Badge>
          </div>
          <div className="text-2xl font-bold text-purple-500">{network?.total_cycles || 0}</div>
          <p className="text-xs text-muted-foreground">Total Cycles Matched</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">
              Potential
            </Badge>
          </div>
          <div className="text-2xl font-bold text-amber-500">₱{potentialEarnings.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">{potentialCycles} pending cycles</p>
        </Card>
      </div>

      {/* Volume Balance */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          Binary Leg Volumes
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-blue-500" />
                Left Leg Volume
              </span>
              <span className="font-bold text-blue-500">₱{(network?.left_volume || 0).toLocaleString()}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((network?.left_volume || 0) / Math.max(network?.left_volume || 1, network?.right_volume || 1)) * 100)}%` 
                }}
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                Right Leg Volume
              </span>
              <span className="font-bold text-green-500">₱{(network?.right_volume || 0).toLocaleString()}</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, ((network?.right_volume || 0) / Math.max(network?.left_volume || 1, network?.right_volume || 1)) * 100)}%` 
                }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Weaker Leg:</strong> ₱{weakerLeg.toLocaleString()} • 
            <strong className="ml-2">Cycle Amount:</strong> ₱{settings.cycleAmount.toLocaleString()} • 
            <strong className="ml-2">Commission per Cycle:</strong> ₱{settings.cycleCommission}
          </p>
        </div>
      </Card>

      {/* Daily Earnings */}
      {dailyEarnings.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Daily Earnings (Last 7 Days)
          </h3>
          <div className="space-y-3">
            {dailyEarnings.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                <div>
                  <p className="font-medium">{formatDate(day.date)}</p>
                  <p className="text-xs text-muted-foreground">{day.cycles} cycles completed</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-500">+₱{day.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Recent Binary Commissions
        </h3>
        {earnings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No binary commissions yet</p>
            <p className="text-sm">Start building your binary network to earn commissions!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {earnings.map((earning) => (
              <div key={earning.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {earning.cycles_matched || 1} cycle(s)
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      L: ₱{earning.left_volume_used?.toLocaleString()} | R: ₱{earning.right_volume_used?.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(earning.created_at)} at {formatTime(earning.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-500">+₱{Number(earning.amount).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
