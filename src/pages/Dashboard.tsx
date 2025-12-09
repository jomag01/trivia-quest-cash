import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Trophy, Users, DollarSign, Target, TrendingUp, Award, Copy, Clock, Package, Menu, Shield, LogOut } from "lucide-react";
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
import AffiliateRankCard from "@/components/AffiliateRankCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { ActiveUsersStats } from "@/components/ActiveUsersStats";
import { NotificationsList } from "@/components/NotificationsList";
import { DiamondHistory } from "@/components/DiamondHistory";
import { DiamondLeaderboard } from "@/components/DiamondLeaderboard";
import { GenealogyTree } from "@/components/GenealogyTree";
import { UplineTransferRequest } from "@/components/UplineTransferRequest";
import EarningsCalculator from "@/components/EarningsCalculator";
import LeadershipStatus from "@/components/LeadershipStatus";
import { CustomerSupportChat } from "@/components/CustomerSupportChat";
import { UserAdCreation } from "@/components/UserAdCreation";
import { RecentTransactions } from "@/components/RecentTransactions";
const Dashboard = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading,
    signOut
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      fetchAllData();
      checkAdminRole();
    }
  }, [user]);
  const checkAdminRole = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  // Refresh data when switching to network tab
  useEffect(() => {
    if (activeTab === "network" && user) {
      fetchReferralLevels();
    }
  }, [activeTab, user]);

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
        const {
          data,
          error
        } = await supabase.from("profiles").select("full_name, email").eq("id", profile.referred_by).maybeSingle();
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
      // Fetch both user wallet and treasure wallet
      const [walletResult, treasureResult] = await Promise.all([supabase.from("user_wallets").select("*").eq("user_id", user?.id).maybeSingle(), supabase.from("treasure_wallet").select("*").eq("user_id", user?.id).maybeSingle()]);
      if (walletResult.error) throw walletResult.error;
      let walletData = walletResult.data;
      if (!walletData) {
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
        walletData = newWallet;
      }

      // Add treasure wallet data
      const treasureDiamonds = (treasureResult.data as any)?.diamonds || 0;
      setWallet({
        ...walletData,
        diamond_balance: treasureDiamonds,
        diamond_earned: treasureDiamonds // Using diamonds as both balance and earned
      });
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
          levelsData.push({
            level,
            count: 0,
            earnings: 0
          });
          continue;
        }

        // Get members at this level
        const {
          data: members,
          error: membersError
        } = await supabase.from("profiles").select("id").in("referred_by", currentLevelIds);
        if (membersError) throw membersError;
        const memberIds = members?.map(m => m.id) || [];

        // Get earnings from this level
        const {
          data: levelCommissions,
          error: commissionsError
        } = await supabase.from("commissions").select("amount").eq("user_id", user?.id).eq("level", level);
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
      const {
        data,
        error
      } = await supabase.from("commissions").select("*").eq("user_id", user?.id).order("created_at", {
        ascending: false
      }).limit(10);
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
  const referralLevels = referralLevelsData.length > 0 ? referralLevelsData : [{
    level: 1,
    count: 0,
    earnings: 0
  }, {
    level: 2,
    count: 0,
    earnings: 0
  }, {
    level: 3,
    count: 0,
    earnings: 0
  }, {
    level: 4,
    count: 0,
    earnings: 0
  }, {
    level: 5,
    count: 0,
    earnings: 0
  }, {
    level: 6,
    count: 0,
    earnings: 0
  }, {
    level: 7,
    count: 0,
    earnings: 0
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-gradient-gold text-base">
                  {profile.full_name || profile.email}
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">Player ID: {userStats.referralCode}</p>
                  {referrerName && <>
                      <span className="text-sm text-muted-foreground">•</span>
                      <p className="text-sm text-muted-foreground">
                        Referred by: <span className="text-primary font-semibold">{referrerName}</span>
                      </p>
                    </>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && <Link to="/admin">
                  <Button variant="outline" className="gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Panel</span>
                  </Button>
                </Link>}
              <Button variant="outline" className="gap-2 text-destructive hover:text-destructive" onClick={async () => {
              await signOut();
              navigate('/auth');
            }}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          <h1 className="font-bold mb-2 text-gradient-gold text-lg">
            Player Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Track your progress and earnings</p>
        </div>

        {/* Tabs - Desktop only, Hamburger for Mobile/Tablet */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          {/* Mobile/Tablet Hamburger Menu */}
          <div className="lg:hidden mb-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Menu className="w-5 h-5" />
                  <span className="capitalize">{activeTab.replace('-', ' ')}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-background border-primary/20">
                <div className="flex flex-col gap-2 mt-8">
                  <Button variant={activeTab === "overview" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("overview");
                  setMobileMenuOpen(false);
                }}>
                    Overview
                  </Button>
                  <Button variant={activeTab === "network" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("network");
                  setMobileMenuOpen(false);
                }}>
                    Network Tree
                  </Button>
                  <Button variant={activeTab === "calculator" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("calculator");
                  setMobileMenuOpen(false);
                }}>
                    Calculator
                  </Button>
                  <Button variant={activeTab === "leadership" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("leadership");
                  setMobileMenuOpen(false);
                }}>
                    Leadership
                  </Button>
                  <Button variant={activeTab === "notifications" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("notifications");
                  setMobileMenuOpen(false);
                }}>
                    Notifications
                  </Button>
                  <Button variant={activeTab === "diamonds" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("diamonds");
                  setMobileMenuOpen(false);
                }}>
                    Diamonds
                  </Button>
                  <Button variant={activeTab === "leaderboard" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("leaderboard");
                  setMobileMenuOpen(false);
                }}>
                    Leaderboard
                  </Button>
                  <Button variant={activeTab === "cart" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("cart");
                  setMobileMenuOpen(false);
                }}>
                    Cart
                  </Button>
                  <Button variant={activeTab === "wishlist" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("wishlist");
                  setMobileMenuOpen(false);
                }}>
                    Wishlist
                  </Button>
                  <Button variant={activeTab === "orders" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("orders");
                  setMobileMenuOpen(false);
                }}>
                    Orders
                  </Button>
                  <Button variant={activeTab === "stair-step" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("stair-step");
                  setMobileMenuOpen(false);
                }}>
                    Stair Step
                  </Button>
                  <Button variant={activeTab === "advertising" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("advertising");
                  setMobileMenuOpen(false);
                }}>
                    Advertising
                  </Button>
                  <Button variant={activeTab === "support" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("support");
                  setMobileMenuOpen(false);
                }}>
                    Support
                  </Button>
                  <Button variant={activeTab === "transactions" ? "default" : "ghost"} className="justify-start" onClick={() => {
                  setActiveTab("transactions");
                  setMobileMenuOpen(false);
                }}>
                    Transactions
                  </Button>
                  <div className="border-t border-border my-2" />
                  <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="hidden lg:grid w-full grid-cols-13 gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="network">Network Tree</TabsTrigger>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="diamonds">Diamonds</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="cart">Cart</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="stair-step">Stair Step</TabsTrigger>
            <TabsTrigger value="advertising">Advertising</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Main Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {/* Active Users */}
              <ActiveUsersStats />
          <Card className="p-3 md:p-4 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            {walletLoading ? <>
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-7 w-full" />
              </> : <>
                <div className="text-xl md:text-2xl font-bold mb-1">₱{userStats.credits}</div>
                <p className="text-xs text-muted-foreground">Available Credits</p>
                <Button variant="outline" size="sm" className="mt-2 w-full h-7 text-xs" onClick={() => setShowBuyCredits(true)}>
                  Buy More Credits
                </Button>
              </>}
          </Card>

          <Card className="p-3 md:p-4 gradient-accent border-amber-500/20 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
              <Badge variant="outline" className="border-amber-500 text-amber-500 text-[10px] px-1.5 py-0">
                💎 Diamonds
              </Badge>
            </div>
            {walletLoading ? <>
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-7 w-full" />
              </> : <>
                <div className="text-xl md:text-2xl font-bold mb-1 text-amber-500">
                  💎 {wallet?.diamond_balance || 0}
                </div>
                <p className="text-xs text-muted-foreground">Diamond Balance</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  Total Earned: 💎 {wallet?.diamond_earned || 0}
                </p>
              </>}
          </Card>

          {!referralLoading && userStats.referrals > 0 && <Card className="p-3 md:p-4 gradient-accent border-primary/20 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                <Badge variant="outline" className="border-green-500 text-green-500 text-[10px] px-1.5 py-0">
                  {userStats.activeReferrals} Active
                </Badge>
              </div>
              <div className="text-xl md:text-2xl font-bold mb-1">{userStats.referrals}</div>
              <p className="text-xs text-muted-foreground">Total Referrals</p>
            </Card>}

          <Card className="p-3 md:p-4 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <Badge variant="outline" className="border-primary/50 text-[10px] px-1.5 py-0">
                Commissions
              </Badge>
            </div>
            {walletLoading ? <>
                <Skeleton className="h-6 w-20 mb-1" />
                <Skeleton className="h-3 w-32" />
              </> : <>
                <div className="text-xl md:text-2xl font-bold mb-1">₱{userStats.totalCommissions.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Total Commissions Earned</p>
              </>}
          </Card>

          <Card className="p-3 md:p-4 gradient-accent border-primary/20 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            {walletLoading ? <>
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-20 mt-0.5" />
              </> : <>
                <div className="text-xl md:text-2xl font-bold mb-1">{formatCurrency(userStats.totalEarnings, profile.currency)}</div>
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-[10px] text-primary mt-0.5">+{formatCurrency(userStats.pendingCommissions, profile.currency)} pending</p>
              </>}
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
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">Affiliate Network<Users className="w-6 h-6 text-primary" />
              7-Level Network
            </h2>

            <div className="space-y-3">
              {referralLoading ? Array.from({
                  length: 7
                }).map((_, i) => <div key={i} className="p-4 bg-background/20 rounded-lg">
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
                  </div>) : referralLevels.map(level => <div key={level.level} className="flex items-center justify-between p-4 bg-background/20 rounded-lg hover:bg-background/30 transition-smooth cursor-pointer" onClick={() => openGenealogy(level.level)}>
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
                  </div>)}
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

      <TabsContent value="network" className="space-y-6">
        <GenealogyTree userId={user?.id || ''} />
        <UplineTransferRequest />
      </TabsContent>

      <TabsContent value="calculator" className="space-y-6">
        <EarningsCalculator />
      </TabsContent>

      <TabsContent value="leadership" className="space-y-6">
        <LeadershipStatus />
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

      <TabsContent value="leaderboard">
        <DiamondLeaderboard />
      </TabsContent>

      <TabsContent value="orders">
        <OrderTracking />
      </TabsContent>

      <TabsContent value="stair-step" className="space-y-6">
        <Card className="p-6">
          <h3 className="text-2xl font-bold mb-6">Stair-Step Leadership Plan</h3>
          <p className="text-muted-foreground mb-6">
            Track your progress through the leadership levels and see your commission rates.
          </p>
          <AffiliateRankCard />
        </Card>
        
        {/* Leadership Breakaway Information */}
        <Card className="p-6 bg-gradient-to-br from-yellow-500/5 to-yellow-600/5 border-yellow-500/20">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-xl font-bold">Leadership 2% Breakaway Bonus</h3>
              <p className="text-sm text-muted-foreground">Exclusive royalty for 21% leaders</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                How it works:
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">1.</span>
                  <span>Reach the highest stair-step level (21% commission rate)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">2.</span>
                  <span>Earn an additional 2% override from all your direct downlines who are also at 21%</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">3.</span>
                  <span>This 2% bonus extends through 7 levels of 21% leaders in your network</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 font-bold">4.</span>
                  <span>Leadership earnings are separate from and in addition to your standard stair-step commissions</span>
                </li>
              </ul>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">View Your Leadership Status</p>
                <p className="text-xs text-muted-foreground">Check your royalty earnings and active 21% leaders in your network</p>
              </div>
              <Button onClick={() => setActiveTab("leadership")} className="bg-yellow-500 hover:bg-yellow-600">
                View Status
              </Button>
            </div>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="advertising" className="space-y-6">
        <UserAdCreation />
      </TabsContent>

      <TabsContent value="support">
        <CustomerSupportChat />
      </TabsContent>

      <TabsContent value="transactions">
        <RecentTransactions />
      </TabsContent>
    </Tabs>
  </div>
  </div>;
};
export default Dashboard;