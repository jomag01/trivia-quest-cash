import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, DollarSign, Target, TrendingUp, Award, Copy, Clock, Package } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/currencies";
import { BuyCreditsDialog } from "@/components/BuyCreditsDialog";
import { CashOutDialog } from "@/components/CashOutDialog";
import { GenealogyDialog } from "@/components/GenealogyDialog";
import { CartView } from "@/components/CartView";
import { WishlistView } from "@/components/WishlistView";
import { CartWidget } from "@/components/CartWidget";
import { OrderTracking } from "@/components/OrderTracking";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import AffiliateRankCard from "@/components/AffiliateRankCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ActiveUsersStats } from "@/components/ActiveUsersStats";
import { NotificationsList } from "@/components/NotificationsList";
import { DiamondHistory } from "@/components/DiamondHistory";
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
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [referralLevelsData, setReferralLevelsData] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [referralLoading, setReferralLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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
    // Fetch data independently without blocking UI
    fetchWallet();
    fetchCategories();
    fetchCompletedCategories();
    fetchReferrer();
    fetchReferralLevels();
    fetchCommissions();
  };
  
  const fetchReferrer = async () => {
    try {
      if (profile?.referred_by) {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", profile.referred_by)
          .maybeSingle();
        
        if (error) throw error;
        if (data) {
          setReferrerName(data.full_name || data.email);
        }
      }
    } catch (error: any) {
      console.error("Error fetching referrer:", error);
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
    } finally {
      setWalletLoading(false);
    }
  };
  const fetchCategories = async () => {
    try {
      const {
        data,
        error
      } = await (supabase as any).from('game_categories').select('*').eq('is_active', true).order('min_level_required', {
        ascending: true
      });
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };
  const fetchCompletedCategories = async () => {
    try {
      const {
        data,
        error
      } = await (supabase as any).from('user_completed_categories').select('category_id').eq('user_id', user?.id);
      if (error) throw error;
      setCompletedCategories(data?.map((c: any) => c.category_id) || []);
    } catch (error: any) {
      console.error("Error fetching completed categories:", error);
    }
  };

  const fetchReferralLevels = async () => {
    try {
      const levelsData = [];
      let currentLevelIds = [user?.id];
      
      // Fetch counts and earnings for each of the 7 levels
      for (let level = 1; level <= 7; level++) {
        if (currentLevelIds.length === 0) {
          levelsData.push({ level, count: 0, earnings: 0 });
          continue;
        }
        
        // Get members at this level
        const { data: members, error: membersError } = await supabase
          .from("profiles")
          .select("id")
          .in("referred_by", currentLevelIds);
          
        if (membersError) throw membersError;
        
        const memberIds = members?.map(m => m.id) || [];
        
        // Get earnings from this level
        const { data: levelCommissions, error: commissionsError } = await supabase
          .from("commissions")
          .select("amount")
          .eq("user_id", user?.id)
          .eq("level", level);
          
        if (commissionsError) throw commissionsError;
        
        const earnings = levelCommissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        
        levelsData.push({
          level,
          count: memberIds.length,
          earnings
        });
        
        // Move to next level
        currentLevelIds = memberIds;
      }
      
      setReferralLevelsData(levelsData);
    } catch (error: any) {
      console.error("Error fetching referral levels:", error);
    } finally {
      setReferralLoading(false);
    }
  };

  const fetchCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from("commissions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (error) throw error;
      setCommissions(data || []);
    } catch (error: any) {
      console.error("Error fetching commissions:", error);
    }
  };
  if (loading || !profile) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Trophy className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>;
  }

  // Calculate user stats from real data
  const totalReferrals = referralLevelsData.reduce((sum, level) => sum + level.count, 0);
  const directReferrals = referralLevelsData.find(l => l.level === 1)?.count || 0;
  
  const userStats = {
    currentLevel: completedCategories.length,
    credits: wallet?.credits || 0,
    referrals: totalReferrals,
    activeReferrals: directReferrals,
    totalEarnings: wallet?.balance || 0,
    totalCommissions: wallet?.total_commissions || 0,
    pendingCommissions: wallet?.pending_commissions || 0,
    referralCode: profile.referral_code
  };
  
  const referralLevels = referralLevelsData.length > 0 ? referralLevelsData : [
    { level: 1, count: 0, earnings: 0 },
    { level: 2, count: 0, earnings: 0 },
    { level: 3, count: 0, earnings: 0 },
    { level: 4, count: 0, earnings: 0 },
    { level: 5, count: 0, earnings: 0 },
    { level: 6, count: 0, earnings: 0 },
    { level: 7, count: 0, earnings: 0 }
  ];
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
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Player ID: {userStats.referralCode}</p>
                {referrerName && (
                  <>
                    <span className="text-sm text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      Referred by: <span className="text-primary font-semibold">{referrerName}</span>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2 text-gradient-gold">
            Player Dashboard
          </h1>
          <p className="text-muted-foreground">Track your progress and earnings</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="diamonds">Diamonds</TabsTrigger>
            <TabsTrigger value="cart">Shopping Cart</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="orders">My Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Featured Products */}
            <FeaturedProducts />

            {/* Main Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Active Users */}
              <ActiveUsersStats />
          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <Target className="w-8 h-8 text-primary" />
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            {walletLoading ? (
              <>
                <Skeleton className="h-9 w-24 mb-2" />
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-9 w-full" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">₱{userStats.credits}</div>
                <p className="text-sm text-muted-foreground">Available Credits</p>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setShowBuyCredits(true)}>
                  Buy More Credits
                </Button>
              </>
            )}
          </Card>

          {!referralLoading && userStats.referrals > 0 && <Card className="p-6 gradient-accent border-primary/20 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-primary" />
                <Badge variant="outline" className="border-green-500 text-green-500">
                  {userStats.activeReferrals} Active
                </Badge>
              </div>
              <div className="text-3xl font-bold mb-2">{userStats.referrals}</div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </Card>}

          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
              <Badge variant="outline" className="border-primary/50">
                Commissions
              </Badge>
            </div>
            {walletLoading ? (
              <>
                <Skeleton className="h-9 w-24 mb-2" />
                <Skeleton className="h-4 w-40" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">₱{userStats.totalCommissions.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Total Commissions Earned</p>
              </>
            )}
          </Card>

          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-primary" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            {walletLoading ? (
              <>
                <Skeleton className="h-9 w-32 mb-2" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-24 mt-1" />
              </>
            ) : (
              <>
                <div className="text-3xl font-bold mb-2">{formatCurrency(userStats.totalEarnings, profile.currency)}</div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-xs text-primary mt-1">+{formatCurrency(userStats.pendingCommissions, profile.currency)} pending</p>
              </>
            )}
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

        {/* Affiliate Rank Card - Full Width */}
        <AffiliateRankCard />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Referral Network */}
          <Card className="p-6 gradient-accent border-primary/20 shadow-card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              7-Level Network
            </h2>

            <div className="space-y-3">
              {referralLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="p-4 bg-background/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-16" />
                        <div>
                          <Skeleton className="h-5 w-24 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-5 w-16 mb-1" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                referralLevels.map(level => <div key={level.level} className="flex items-center justify-between p-4 bg-background/20 rounded-lg hover:bg-background/30 transition-smooth cursor-pointer" onClick={() => openGenealogy(level.level)}>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-16 justify-center border-primary/50">
                        Level {level.level}
                      </Badge>
                      <div>
                        <div className="font-semibold">{level.count} member{level.count !== 1 ? 's' : ''}</div>
                        <div className="text-xs text-muted-foreground">in network</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">₱{level.earnings.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">earned</div>
                    </div>
                  </div>)
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            {/* Cart Widget */}
            <CartWidget onViewCart={() => setActiveTab("cart")} />
            
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
      </TabsContent>

      <TabsContent value="cart">
        <CartView />
      </TabsContent>

      <TabsContent value="wishlist">
        <WishlistView />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationsList />
      </TabsContent>

      <TabsContent value="diamonds">
        <DiamondHistory />
      </TabsContent>

      <TabsContent value="orders">
        <OrderTracking />
      </TabsContent>
    </Tabs>
  </div>
</div>;
};
export default Dashboard;