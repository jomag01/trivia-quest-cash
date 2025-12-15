import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  GitBranch, 
  Users, 
  TrendingUp, 
  Wallet,
  ArrowLeft,
  ArrowRight,
  Crown,
  RefreshCw,
  Clock,
  Loader2,
  Sparkles
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BinaryPosition {
  id: string;
  user_id: string;
  left_volume: number;
  right_volume: number;
  total_cycles: number;
  joined_at: string;
}

interface BinarySettings {
  joinAmount: number;
  cycleVolume: number;
  cycleCommission: number;
  dailyCap: number;
  adminSafetyNet: number;
  autoReplenishEnabled: boolean;
  autoReplenishPercent: number;
}

interface DailyEarning {
  earning_date: string;
  total_earned: number;
  cycles_completed: number;
}

export default function BinaryAffiliateTab({ onBuyCredits }: { onBuyCredits: () => void }) {
  const { user, profile } = useAuth();
  const [binaryPosition, setBinaryPosition] = useState<BinaryPosition | null>(null);
  const [settings, setSettings] = useState<BinarySettings>({
    joinAmount: 500,
    cycleVolume: 1000,
    cycleCommission: 100,
    dailyCap: 5000,
    adminSafetyNet: 35,
    autoReplenishEnabled: true,
    autoReplenishPercent: 20
  });
  const [todayEarnings, setTodayEarnings] = useState<DailyEarning | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch binary settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .like('key', 'binary_%');

      if (settingsData) {
        const newSettings = { ...settings };
        settingsData.forEach(s => {
          if (s.key === 'binary_join_amount') newSettings.joinAmount = parseFloat(s.value || '500');
          if (s.key === 'binary_cycle_volume') newSettings.cycleVolume = parseFloat(s.value || '1000');
          if (s.key === 'binary_cycle_commission') newSettings.cycleCommission = parseFloat(s.value || '100');
          if (s.key === 'binary_daily_cap') newSettings.dailyCap = parseFloat(s.value || '5000');
          if (s.key === 'binary_admin_safety_net') newSettings.adminSafetyNet = parseFloat(s.value || '35');
          if (s.key === 'binary_auto_replenish_enabled') newSettings.autoReplenishEnabled = s.value === 'true';
          if (s.key === 'binary_auto_replenish_percent') newSettings.autoReplenishPercent = parseFloat(s.value || '20');
        });
        setSettings(newSettings);
      }

      // Check if user is enrolled in binary system
      const { data: positionData } = await supabase
        .from('binary_network')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (positionData) {
        setBinaryPosition(positionData as BinaryPosition);
        setIsEnrolled(true);
      } else {
        setIsEnrolled(false);
      }

      // Fetch today's earnings
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyData } = await supabase
        .from('binary_daily_earnings')
        .select('*')
        .eq('user_id', user.id)
        .eq('earning_date', today)
        .maybeSingle();

      if (dailyData) {
        setTodayEarnings(dailyData as DailyEarning);
      }

      // Fetch total earnings
      const { data: commissionData } = await supabase
        .from('binary_commissions')
        .select('amount')
        .eq('user_id', user.id);

      if (commissionData) {
        const total = commissionData.reduce((sum, c) => sum + Number(c.amount), 0);
        setTotalEarnings(total);
      }

    } catch (error) {
      console.error('Error fetching binary data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCycleProgress = () => {
    if (!binaryPosition) return { leftPercent: 0, rightPercent: 0, potentialCycles: 0 };
    
    const leftVolume = binaryPosition.left_volume || 0;
    const rightVolume = binaryPosition.right_volume || 0;
    const cycleVolume = settings.cycleVolume;

    const leftPercent = Math.min((leftVolume / cycleVolume) * 100, 100);
    const rightPercent = Math.min((rightVolume / cycleVolume) * 100, 100);
    const potentialCycles = Math.floor(Math.min(leftVolume, rightVolume) / cycleVolume);

    return { leftPercent, rightPercent, potentialCycles };
  };

  const getDailyCapProgress = () => {
    if (!todayEarnings) return 0;
    return Math.min((todayEarnings.total_earned / settings.dailyCap) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { leftPercent, rightPercent, potentialCycles } = calculateCycleProgress();

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 p-1">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Binary Affiliate System</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Earn commissions through our cycle-based binary network
          </p>
          <Badge variant="outline" className="text-xs">
            Exclusive to AI Credits Purchases
          </Badge>
        </div>

        {/* System Info Banner */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <GitBranch className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  Binary System - AI Credits Only
                </p>
                <p className="text-muted-foreground text-xs">
                  This binary system is <span className="font-semibold">separate</span> from unilevel, stair-step, and leadership commissions. 
                  Binary commissions are earned <span className="font-semibold">only from AI credit purchases</span>, not from shop product purchases. 
                  Shop products earn through unilevel/stair-step/leadership systems instead.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isEnrolled ? (
          /* Not Enrolled View */
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Activate Your Binary Position
              </CardTitle>
              <CardDescription>
                Your referral has enrolled you in all systems. Purchase AI credits to <span className="font-semibold">activate</span> your binary position and start earning!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 rounded-lg bg-background/50 border">
                  <p className="text-2xl font-bold text-primary">₱{settings.joinAmount}</p>
                  <p className="text-xs text-muted-foreground">Minimum to Activate</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border">
                  <p className="text-2xl font-bold text-primary">₱{settings.cycleCommission}</p>
                  <p className="text-xs text-muted-foreground">Per Cycle</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium">How the Binary System works:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Buy AI credits worth ₱{settings.joinAmount}+ to activate</li>
                  <li>Get placed automatically in the weakest leg</li>
                  <li>Earn ₱{settings.cycleCommission} for every ₱{settings.cycleVolume} matched cycle</li>
                  <li>Daily earning cap: ₱{settings.dailyCap}</li>
                  <li>Binary earnings come <span className="font-semibold">only from AI credit purchases</span> in your network</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-muted-foreground">
                <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">💡 Separate Commission Systems:</p>
                <p>• <span className="font-medium">Binary:</span> AI Credit purchases only</p>
                <p>• <span className="font-medium">Unilevel/Stair-Step/Leadership:</span> Shop product purchases only</p>
              </div>

              <Button onClick={onBuyCredits} className="w-full gap-2" size="lg">
                <Sparkles className="h-4 w-4" />
                Buy AI Credits to Activate Binary
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Enrolled View */
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Wallet className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-xl font-bold">₱{totalEarnings.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-2" />
                  <p className="text-xl font-bold">{binaryPosition?.total_cycles || 0}</p>
                  <p className="text-xs text-muted-foreground">Cycles Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-amber-500 mb-2" />
                  <p className="text-xl font-bold">₱{todayEarnings?.total_earned || 0}</p>
                  <p className="text-xs text-muted-foreground">Today's Earnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <RefreshCw className="h-5 w-5 mx-auto text-blue-500 mb-2" />
                  <p className="text-xl font-bold">{potentialCycles}</p>
                  <p className="text-xs text-muted-foreground">Pending Cycles</p>
                </CardContent>
              </Card>
            </div>

            {/* Daily Cap Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Daily Earning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>₱{todayEarnings?.total_earned || 0}</span>
                    <span className="text-muted-foreground">/ ₱{settings.dailyCap} cap</span>
                  </div>
                  <Progress value={getDailyCapProgress()} className="h-2" />
                  {getDailyCapProgress() >= 100 && (
                    <p className="text-xs text-amber-500">Daily cap reached! Earnings continue tomorrow.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Binary Tree Visualization */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Your Binary Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Left Leg */}
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4 text-primary" />
                      <span className="font-medium">Left Leg</span>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">₱{binaryPosition?.left_volume?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Volume</p>
                    </div>
                    <Progress value={leftPercent} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {leftPercent.toFixed(1)}% to next cycle
                    </p>
                  </div>

                  {/* Right Leg */}
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">Right Leg</span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">₱{binaryPosition?.right_volume?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Volume</p>
                    </div>
                    <Progress value={rightPercent} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {rightPercent.toFixed(1)}% to next cycle
                    </p>
                  </div>
                </div>

                {/* Cycle Info */}
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-sm">
                    <span className="font-medium">Cycle requirement:</span> ₱{settings.cycleVolume} matched on both legs
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Earn ₱{settings.cycleCommission} per completed cycle
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Auto-Replenish Info */}
            {settings.autoReplenishEnabled && (
              <Card className="border-blue-500/20 bg-blue-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Auto-Replenish Active</p>
                      <p className="text-xs text-muted-foreground">
                        {settings.autoReplenishPercent}% of your unilevel, stair-step, and leadership commissions 
                        will automatically replenish your AI credits.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Buy More Credits */}
            <Button onClick={onBuyCredits} className="w-full gap-2" variant="outline">
              <Sparkles className="h-4 w-4" />
              Buy More AI Credits
            </Button>
          </>
        )}
      </div>
    </ScrollArea>
  );
}