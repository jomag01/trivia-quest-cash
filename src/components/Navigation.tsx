import { Link, useLocation } from "react-router-dom";
import { Sparkles, Gamepad2, ShoppingBag, Plus, MessageSquare, User, Rss } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { CreatePost } from "@/components/social/CreatePost";

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-background/95 backdrop-blur-lg border-t border-border shadow-lg pb-[env(safe-area-inset-bottom,0px)]" style={{ position: 'fixed' }}>
      <div className="flex items-center justify-around h-14 max-w-screen-xl mx-auto px-1">
        {/* AI Hub (Home) */}
        <Link
          to="/"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            isActive("/") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-medium">AI Hub</span>
        </Link>

        {/* Feed */}
        <Link
          to="/feed"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            isActive("/feed") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Rss className="w-5 h-5" />
          <span className="text-[9px] font-medium">Feed</span>
        </Link>

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

        {/* Create Post (Center) - TikTok style */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md">
              <Plus className="w-5 h-5" strokeWidth={3} />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <CreatePost onPostCreated={() => {}} />
          </DialogContent>
        </Dialog>

        {/* Shop */}
        <Link
          to="/shop"
          className={`flex flex-col items-center justify-center gap-0.5 min-w-[40px] py-2 ${
            isActive("/shop") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[9px] font-medium">Shop</span>
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
      </div>
    </nav>
  );
};

export default Navigation;
