import { Link, useLocation, useNavigate } from "react-router-dom";
import { Sparkles, Gamepad2, ShoppingBag, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AddToHomeScreenButton } from "@/components/AddToHomeScreenButton";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  // Handle Shop click - navigate to AI Hub with shop tab
  const handleShopClick = () => {
    navigate('/?tab=shop');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-background/95 backdrop-blur-lg border-t border-border shadow-lg pb-[env(safe-area-inset-bottom,0px)]" style={{ position: 'fixed' }}>
      <div className="flex items-center justify-around h-14 max-w-screen-xl mx-auto px-1">
        {/* AI Hub (Home) */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            isActive("/") && !location.search.includes('tab=shop') ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-medium">AI Hub</span>
        </Link>

        {/* Shop - opens AI Hub with shop tab */}
        <button
          onClick={handleShopClick}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            location.search.includes('tab=shop') ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[9px] font-medium">Shop</span>
        </button>

        {/* Games */}
        <Link
          to="/games"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            isActive("/games") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Gamepad2 className="w-5 h-5" />
          <span className="text-[9px] font-medium">Games</span>
        </Link>

        {/* Messages */}
        <Link
          to="/community"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 relative ${
            isActive("/community") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-medium">Chat</span>
        </Link>

        {/* Profile */}
        <Link
          to={user ? "/dashboard" : "/auth"}
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            isActive("/dashboard") || isActive("/auth") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-medium">Profile</span>
        </Link>

        {/* Add to Home Screen - Only shown on mobile when not installed */}
        <div className="flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2">
          <AddToHomeScreenButton 
            variant="ghost" 
            size="icon" 
            showLabel={false}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
          />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
