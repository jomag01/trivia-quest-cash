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
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        {/* Profile Menu (Left side - like X) */}
        <div className="flex items-center gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex-shrink-0">
                <Avatar className="h-8 w-8 ring-2 ring-amber-500/30">
                  <AvatarImage src={(profile as any)?.avatar_url || ""} />
                  <AvatarFallback className="bg-zinc-800 text-amber-300 text-xs">
                    {username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-zinc-950 border-zinc-800">
              <SheetHeader className="p-4 pb-2">
                {/* Profile Header */}
                <div className="flex items-center justify-between">
                  <Avatar className="h-10 w-10 ring-2 ring-amber-500/30">
                    <AvatarImage src={(profile as any)?.avatar_url || ""} />
                    <AvatarFallback className="bg-zinc-800 text-amber-300">
                      {username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                {user ? (
                  <>
                    <div className="text-left mt-2">
                      <p className="font-bold text-lg text-white">{username}</p>
                      <p className="text-zinc-500 text-sm">{handle}</p>
                    </div>
                    
                    {/* Following/Followers */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <button 
                        onClick={() => handleMenuItemClick(`/profile/${user.id}`)}
                        className="hover:underline"
                      >
                        <span className="font-bold text-white">{followingCount}</span>
                        <span className="text-zinc-500 ml-1">Following</span>
                      </button>
                      <button 
                        onClick={() => handleMenuItemClick(`/profile/${user.id}`)}
                        className="hover:underline"
                      >
                        <span className="font-bold text-white">{followersCount}</span>
                        <span className="text-zinc-500 ml-1">Followers</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-left mt-2">
                    <p className="font-bold text-white">Welcome! 🐝</p>
                    <p className="text-zinc-500 text-sm">Sign in to continue</p>
                  </div>
                )}
              </SheetHeader>

              <Separator className="my-2 bg-zinc-800" />

              {/* Menu Items */}
              <nav className="px-2 py-2">
                {user ? (
                  <>
                    <button
                      onClick={() => handleMenuItemClick(`/profile/${user.id}`)}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-white"
                    >
                      <User className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-lg">Profile</span>
                    </button>

                    <button
                      onClick={() => handleMenuItemClick("/dashboard")}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-white"
                    >
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-lg">Dashboard</span>
                    </button>

                    <button
                      onClick={() => handleMenuItemClick("/community")}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-white"
                    >
                      <Users className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-lg">Communities</span>
                    </button>

                    <button
                      onClick={() => {}}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-white"
                    >
                      <Bookmark className="w-5 h-5 text-amber-400" />
                      <span className="font-semibold text-lg">Bookmarks</span>
                    </button>

                    <Separator className="my-2 bg-zinc-800" />

                    {/* Settings & Support */}
                    <button
                      onClick={() => handleMenuItemClick("/dashboard?tab=settings")}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-white"
                    >
                      <span className="font-semibold">Settings & Support</span>
                      <ChevronDown className="w-4 h-4 text-zinc-500" />
                    </button>

                    <div className="pl-4">
                      <button
                        onClick={() => handleMenuItemClick("/dashboard?tab=settings")}
                        className="flex items-center gap-4 w-full px-4 py-2 rounded-full hover:bg-zinc-900 transition-colors text-zinc-300"
                      >
                        <Settings className="w-4 h-4 text-amber-400" />
                        <span>Account Settings</span>
                      </button>
                    </div>

                    <Separator className="my-2 bg-zinc-800" />

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-semibold text-lg">Log out</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleMenuItemClick("/auth")}
                    className="flex items-center gap-4 w-full px-4 py-3 rounded-full hover:bg-zinc-900 transition-colors text-white"
                  >
                    <LogIn className="w-5 h-5 text-amber-400" />
                    <span className="font-semibold text-lg">Sign In 🐝</span>
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-black text-lg">🐝</span>
            </div>
          )}
        </button>

        {/* Right Actions */}
        <div className="flex items-center gap-1">
          {/* Search - Expandable on mobile */}
          {showSearch && (
            <>
              {searchOpen ? (
                <div className="absolute inset-x-0 px-4 bg-black flex items-center h-14 z-50">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-10 h-9 bg-zinc-900 border-zinc-700 rounded-full text-sm text-white placeholder:text-zinc-500"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-zinc-400 hover:text-white"
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
                  className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800"
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
            className="h-9 w-9 relative text-zinc-400 hover:text-white hover:bg-zinc-800"
            onClick={() => navigate("/notifications")}
          >
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-amber-500 text-black font-bold">
              3
            </Badge>
          </Button>
        </div>
      </div>
    </header>
  );
}
