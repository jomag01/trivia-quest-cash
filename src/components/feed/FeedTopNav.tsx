import { useState, useEffect } from "react";
import { Search, Bell, User, X, LayoutGrid, Home, ShoppingBag, Utensils, Gamepad2, MessageCircle, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Sparkles, label: "AI Hub", path: "/ai-hub" },
    { icon: ShoppingBag, label: "Shop", path: "/shop" },
    { icon: Utensils, label: "Food", path: "/food" },
    { icon: Gamepad2, label: "Games", path: "/games" },
    { icon: MessageCircle, label: "Community", path: "/community" },
    { icon: Calendar, label: "Booking", path: "/booking" },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-3xl mx-auto">
        {/* Navigation Menu */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <LayoutGrid className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-background border border-border shadow-lg">
              {navItems.map((item) => (
                <DropdownMenuItem 
                  key={item.path} 
                  onClick={() => navigate(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Logo */}
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
        </div>

        {/* Search - Expandable on mobile */}
        {showSearch && (
          <div className={`${searchOpen ? 'absolute inset-x-0 px-4 bg-background' : 'hidden md:flex'} flex-1 max-w-md mx-4`}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-9 bg-secondary border-0 rounded-full text-sm"
              />
              {searchOpen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showSearch && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-5 h-5" />
            </Button>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={(profile as any)?.avatar_url || ""} />
                  <AvatarFallback className="bg-secondary text-xs">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user ? (
                <>
                  <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard?tab=settings")}>
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    Sign Out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => navigate("/auth")}>
                  Sign In
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
