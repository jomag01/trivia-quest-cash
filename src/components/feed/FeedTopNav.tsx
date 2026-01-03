import { useState, useEffect } from "react";
import { 
  Search, Bell, X, User, Settings, Bookmark, Users, 
  LogOut, LogIn, Crown, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface FeedTopNavProps {
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

export default function FeedTopNav({ onSearchChange, showSearch = true }: FeedTopNavProps) {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    const loadAppLogo = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_logo")
        .maybeSingle();
      
      if (data?.value) {
        setAppLogo(data.value);
      }
    };
    loadAppLogo();
  }, []);

  useEffect(() => {
    if (user) {
      loadFollowCounts();
    }
  }, [user]);

  const loadFollowCounts = async () => {
    if (!user) return;

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
      supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
    ]);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const handleMenuItemClick = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
  };

  const username = profile?.full_name || user?.email?.split("@")[0] || "User";
  const handle = `@${username.toLowerCase().replace(/\s+/g, "")}`;

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        {/* Profile Menu (Left side - like X) */}
        <div className="flex items-center gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex-shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(profile as any)?.avatar_url || ""} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-background">
              <SheetHeader className="p-4 pb-2">
                {/* Profile Header */}
                <div className="flex items-center justify-between">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={(profile as any)?.avatar_url || ""} />
                    <AvatarFallback className="bg-secondary">
                      {username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {user ? (
                  <>
                    <div className="text-left mt-2">
                      <p className="font-bold text-lg">{username}</p>
                      <p className="text-muted-foreground text-sm">{handle}</p>
                    </div>
                    
                    {/* Following/Followers */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <button 
                        onClick={() => handleMenuItemClick(`/profile/${user.id}`)}
                        className="hover:underline"
                      >
                        <span className="font-bold">{followingCount}</span>
                        <span className="text-muted-foreground ml-1">Following</span>
                      </button>
                      <button 
                        onClick={() => handleMenuItemClick(`/profile/${user.id}`)}
                        className="hover:underline"
                      >
                        <span className="font-bold">{followersCount}</span>
                        <span className="text-muted-foreground ml-1">Followers</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-left mt-2">
                    <p className="font-bold">Welcome!</p>
                    <p className="text-muted-foreground text-sm">Sign in to continue</p>
                  </div>
                )}
              </SheetHeader>

              <Separator className="my-2" />

              {/* Menu Items */}
              <nav className="px-2 py-2">
                {user ? (
                  <>
                    <button
                      onClick={() => handleMenuItemClick(`/profile/${user.id}`)}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-muted transition-colors"
                    >
                      <User className="w-5 h-5" />
                      <span className="font-semibold text-lg">Profile</span>
                    </button>

                    <button
                      onClick={() => handleMenuItemClick("/dashboard")}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-muted transition-colors"
                    >
                      <Crown className="w-5 h-5" />
                      <span className="font-semibold text-lg">Dashboard</span>
                    </button>

                    <button
                      onClick={() => handleMenuItemClick("/community")}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-muted transition-colors"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-semibold text-lg">Communities</span>
                    </button>

                    <button
                      onClick={() => {}}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-muted transition-colors"
                    >
                      <Bookmark className="w-5 h-5" />
                      <span className="font-semibold text-lg">Bookmarks</span>
                    </button>

                    <Separator className="my-2" />

                    {/* Settings & Support */}
                    <button
                      onClick={() => handleMenuItemClick("/dashboard?tab=settings")}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-full hover:bg-muted transition-colors"
                    >
                      <span className="font-semibold">Settings & Support</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <div className="pl-4">
                      <button
                        onClick={() => handleMenuItemClick("/dashboard?tab=settings")}
                        className="flex items-center gap-4 w-full px-4 py-2 rounded-full hover:bg-muted transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    <Separator className="my-2" />

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-muted transition-colors text-destructive"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-semibold text-lg">Log out</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleMenuItemClick("/auth")}
                    className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-muted transition-colors"
                  >
                    <LogIn className="w-5 h-5" />
                    <span className="font-semibold text-lg">Sign In</span>
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Center Logo */}
        <button 
          onClick={() => navigate("/")}
          className="flex items-center"
        >
          {appLogo ? (
            <img src={appLogo} alt="App Logo" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
          )}
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Search - Expandable on mobile */}
          {showSearch && (
            <>
              {searchOpen ? (
                <div className="absolute inset-x-0 px-4 bg-background flex items-center h-14">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 h-9 bg-secondary border-0 rounded-full text-sm"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchOpen(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-accent text-accent-foreground">
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
