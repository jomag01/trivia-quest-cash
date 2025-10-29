import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, DollarSign, Target, TrendingUp, Award, Copy, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currencies";
import { BuyCreditsDialog } from "@/components/BuyCreditsDialog";
import { CashOutDialog } from "@/components/CashOutDialog";
import { GenealogyDialog } from "@/components/GenealogyDialog";
import { supabase } from "@/integrations/supabase/client";
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading
  } = useAuth();
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [showGenealogy, setShowGenealogy] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [wallet, setWallet] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Fetch all data in parallel for better performance
  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchWallet(),
        fetchCategories(),
        fetchCompletedCategories()
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  };
  const fetchWallet = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("user_wallets").select("*").eq("user_id", user?.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        // Create wallet if it doesn't exist
        const {
          data: newWallet,
          error: createError
        } = await supabase.from("user_wallets").insert([{
          user_id: user?.id,
          balance: 0,
          credits: 0
        }]).select().single();
        if (createError) throw createError;
        setWallet(newWallet);
      } else {
        setWallet(data);
      }
    } catch (error: any) {
      console.error("Error fetching wallet:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('game_categories')
        .select('*')
        .eq('is_active', true)
        .order('min_level_required', { ascending: true });
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchCompletedCategories = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_completed_categories')
        .select('category_id')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      setCompletedCategories(data?.map((c: any) => c.category_id) || []);
    } catch (error: any) {
      console.error("Error fetching completed categories:", error);
    }
  };
  if (loading || !profile || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }

  // Mock data - will be replaced with real data from database
  const userStats = {
    currentLevel: 5,
    credits: wallet?.credits || 0,
    referrals: 3,
    activeReferrals: 2,
    totalEarnings: wallet?.balance || 0,
    pendingEarnings: 350,
    referralCode: profile.referral_code
  };
  const referralLevels = [{
    level: 1,
    count: 3,
    earnings: 500
  }, {
    level: 2,
    count: 8,
    earnings: 800
  }, {
    level: 3,
    count: 15,
    earnings: 600
  }, {
    level: 4,
    count: 25,
    earnings: 400
  }, {
    level: 5,
    count: 12,
    earnings: 200
  }, {
    level: 6,
    count: 5,
    earnings: 100
  }, {
    level: 7,
    count: 2,
    earnings: 50
  }];
  const copyReferralCode = () => {
    navigator.clipboard.writeText(userStats.referralCode);
    toast.success("Referral code copied to clipboard!");
  };
  const openGenealogy = (level: number) => {
    setSelectedLevel(level);
    setShowGenealogy(true);
  };
  return <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gradient-gold">
                {profile.full_name || profile.email}
              </h2>
              <p className="text-sm text-muted-foreground">Player ID: {userStats.referralCode}</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient-gold">
            Player Dashboard
          </h1>
          <p className="text-muted-foreground">Track your progress and earnings</p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 text-primary" />
              <Badge variant="outline" className="border-primary/50">
                Level {userStats.currentLevel}
              </Badge>
            </div>
            <div className="text-3xl font-bold mb-2">{userStats.currentLevel}/10</div>
            <p className="text-sm text-muted-foreground">Current Level</p>
            <Progress value={userStats.currentLevel * 10} className="mt-3 h-2" />
          </Card>

          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-primary" />
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mb-2">₱{userStats.credits}</div>
            <p className="text-sm text-muted-foreground">Available Credits</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowBuyCredits(true)}>
              Buy More Credits
            </Button>
          </Card>

          {userStats.referrals > 0 && (
            <Card className="p-6 gradient-accent border-primary/20 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-primary" />
                <Badge variant="outline" className="border-green-500 text-green-500">
                  {userStats.activeReferrals} Active
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-2">{userStats.referrals}</div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </Card>
          )}

          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold mb-2">{formatCurrency(userStats.totalEarnings, profile.currency)}</div>
            <p className="text-sm text-muted-foreground">Total Earnings</p>
            <p className="text-xs text-primary mt-1">+{formatCurrency(userStats.pendingEarnings, profile.currency)} pending</p>
          </Card>
        </div>

        {/* Level Progress Alert */}
        {userStats.currentLevel === 5 && <Card className="p-6 mb-8 gradient-primary border-primary/20 shadow-gold">
            <div className="flex items-start gap-4">
              <Award className="w-10 h-10 text-primary flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">Unlock Next Levels!</h3>
                <p className="text-foreground/90 mb-4">
                  You need {2 - userStats.activeReferrals} more active referral(s) to continue past Level 5.
                  Share your referral code to unlock more levels!
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={copyReferralCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Referral Code
                  </Button>
                  <span className="flex items-center px-4 py-2 bg-background/20 rounded-lg font-mono font-bold">
                    {userStats.referralCode}
                  </span>
                </div>
              </div>
            </div>
          </Card>}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Referral Network */}
          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              7-Level Network
            </h2>

            <div className="space-y-3">
              {referralLevels.map(level => <div key={level.level} className="flex items-center justify-between p-4 bg-background/20 rounded-lg hover:bg-background/30 transition-smooth cursor-pointer" onClick={() => openGenealogy(level.level)}>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-16 justify-center border-primary/50">
                      Level {level.level}
                    </Badge>
                    <span className="font-semibold">{level.count} members</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{formatCurrency(level.earnings, profile.currency)}</div>
                    <div className="text-xs text-muted-foreground">earned</div>
                  </div>
                </div>)}
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card className="p-6 gradient-accent border-primary/20 shadow-card">
              <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
              
              <div className="space-y-3">
                <Button className="w-full justify-start h-auto py-4" asChild>
                  <Link to="/game">
                    <Trophy className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">Continue Game</div>
                      <div className="text-xs opacity-80">Resume from Level {userStats.currentLevel}</div>
                    </div>
                  </Link>
                </Button>

                <Button className="w-full justify-start h-auto py-4" asChild>
                  <Link to="/">
                    <Package className="w-5 h-5 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">Select Game Category</div>
                      <div className="text-xs opacity-80">Choose from available games</div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="w-full justify-start h-auto py-4" onClick={() => setShowCashOut(true)}>
                  <DollarSign className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Cash Out</div>
                    <div className="text-xs opacity-80">Withdraw to GCash or Bank</div>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start h-auto py-4" onClick={() => setShowBuyCredits(true)}>
                  <Target className="w-5 h-5 mr-3" />
                  <div className="text-left">
                    <div className="font-bold">Buy Credits</div>
                    <div className="text-xs opacity-80">Top up your gaming credits</div>
                  </div>
                </Button>
              </div>
            </Card>

            <Card className="p-6 gradient-primary border-primary/20 shadow-card text-center">
              <Trophy className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse-slow" />
              <h3 className="text-xl font-bold mb-2">Level 10 Rewards</h3>
              <p className="text-foreground/90 mb-4">
                Reach Level 10 to unlock residual income from your entire network and shop commissions!
              </p>
              <Progress value={userStats.currentLevel * 10} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {10 - userStats.currentLevel} levels to go
              </p>
            </Card>
          </div>
        </div>

        {/* Dialogs */}
        <BuyCreditsDialog open={showBuyCredits} onOpenChange={setShowBuyCredits} />
        <CashOutDialog open={showCashOut} onOpenChange={setShowCashOut} currentBalance={wallet?.balance || 0} />
        <GenealogyDialog open={showGenealogy} onOpenChange={setShowGenealogy} level={selectedLevel} userId={user?.id || ''} />
      </div>
    </div>;
};
export default Dashboard;