import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  Gavel, Search, Filter, Clock, Trophy, TrendingUp, 
  Star, Plus, Heart, ChevronRight, Flame
} from "lucide-react";
import Navigation from "@/components/Navigation";
import AuctionListings from "@/components/auction/AuctionListings";
import CreateAuctionDialog from "@/components/auction/CreateAuctionDialog";
import MyAuctions from "@/components/auction/MyAuctions";
import AuctionWatchlist from "@/components/auction/AuctionWatchlist";
import MyBids from "@/components/auction/MyBids";
import { toast } from "sonner";

interface AuctionCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
}

const Auction = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<AuctionCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isVerifiedSeller, setIsVerifiedSeller] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [stats, setStats] = useState({
    activeAuctions: 0,
    endingSoon: 0,
    hotBids: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchStats();
    if (user) {
      checkSellerStatus();
    }
  }, [user]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("auction_categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    if (data) setCategories(data);
  };

  const fetchStats = async () => {
    const now = new Date().toISOString();
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const [activeRes, endingRes, hotRes] = await Promise.all([
      supabase.from("auctions").select("id", { count: "exact" }).eq("status", "active"),
      supabase.from("auctions").select("id", { count: "exact" }).eq("status", "active").lt("ends_at", soon),
      supabase.from("auctions").select("id", { count: "exact" }).eq("status", "active").gte("bid_count", 5)
    ]);

    setStats({
      activeAuctions: activeRes.count || 0,
      endingSoon: endingRes.count || 0,
      hotBids: hotRes.count || 0
    });
  };

  const checkSellerStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_verified_seller")
      .eq("id", user.id)
      .single();
    setIsVerifiedSeller(data?.is_verified_seller || false);
  };

  const handleCreateAuction = () => {
    if (!user) {
      toast.error("Please login to create an auction");
      return;
    }
    if (!isVerifiedSeller) {
      toast.error("Only verified sellers can create auctions");
      return;
    }
    setShowCreateDialog(true);
  };

  const getIconComponent = (iconName: string) => {
    const icons: Record<string, any> = {
      Clock, Trophy, Gavel, Star, Flame, TrendingUp
    };
    return icons[iconName] || Gavel;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-b">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
        <div className="container mx-auto px-4 py-8 relative">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent flex items-center gap-3">
                <Gavel className="h-10 w-10 text-amber-500" />
                Live Auctions
              </h1>
              <p className="text-muted-foreground mt-2">
                Bid on unique items from verified sellers
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-4">
              <div className="bg-card/80 backdrop-blur rounded-xl p-4 text-center border shadow-lg">
                <div className="text-2xl font-bold text-amber-500">{stats.activeAuctions}</div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-xl p-4 text-center border shadow-lg">
                <div className="text-2xl font-bold text-red-500">{stats.endingSoon}</div>
                <div className="text-xs text-muted-foreground">Ending Soon</div>
              </div>
              <div className="bg-card/80 backdrop-blur rounded-xl p-4 text-center border shadow-lg">
                <div className="text-2xl font-bold text-orange-500">{stats.hotBids}</div>
                <div className="text-xs text-muted-foreground">Hot Bids</div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search auctions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card/80 backdrop-blur border-muted"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            {isVerifiedSeller && (
              <Button 
                onClick={handleCreateAuction}
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Auction
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Category Slider */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4">
          <ScrollArea className="w-full whitespace-nowrap py-4">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
                className={selectedCategory === "all" ? "bg-amber-500 hover:bg-amber-600" : ""}
              >
                <Gavel className="h-4 w-4 mr-2" />
                All Auctions
              </Button>
              <Button
                variant={selectedCategory === "ending-soon" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("ending-soon")}
                className={selectedCategory === "ending-soon" ? "bg-red-500 hover:bg-red-600" : ""}
              >
                <Clock className="h-4 w-4 mr-2" />
                Ending Soon
              </Button>
              <Button
                variant={selectedCategory === "hot" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("hot")}
                className={selectedCategory === "hot" ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                <Flame className="h-4 w-4 mr-2" />
                Hot Bids
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.slug ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.slug)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="browse" className="gap-2">
              <Gavel className="h-4 w-4" />
              Browse
            </TabsTrigger>
            {user && (
              <>
                <TabsTrigger value="my-bids" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  My Bids
                </TabsTrigger>
                <TabsTrigger value="watchlist" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Watchlist
                </TabsTrigger>
                {isVerifiedSeller && (
                  <TabsTrigger value="my-auctions" className="gap-2">
                    <Trophy className="h-4 w-4" />
                    My Auctions
                  </TabsTrigger>
                )}
              </>
            )}
          </TabsList>

          <TabsContent value="browse">
            <AuctionListings 
              category={selectedCategory} 
              searchQuery={searchQuery}
            />
          </TabsContent>

          <TabsContent value="my-bids">
            <MyBids />
          </TabsContent>

          <TabsContent value="watchlist">
            <AuctionWatchlist />
          </TabsContent>

          <TabsContent value="my-auctions">
            <MyAuctions onCreateNew={() => setShowCreateDialog(true)} />
          </TabsContent>
        </Tabs>
      </div>

      <CreateAuctionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        categories={categories}
      />
    </div>
  );
};

export default Auction;
